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
        
        <div style={{ textAlign: 'center', marginBottom: 25 }}>
          <h2 className="section-title" style={{ marginBottom: 10 }}>
            Bienvenido 👋
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          <div
            style={{
              background: '#f3f4f6',
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              color: '#111827',
              textAlign: 'center'
            }}
          >
            🔐 Ingrese los últimos 4 dígitos de su cédula
          </div>

          <input
            type="text"
            maxLength={4}
            inputMode="numeric"
            placeholder="0000"
            value={ultimos4}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '')
              setUltimos4(value)
            }}
            style={{
              width: '100%',
              padding: '14px 12px',
              borderRadius: 12,
              border: ultimos4.length === 4
                ? '2px solid #16a34a'
                : '2px solid #e5e7eb',
              fontSize: 22,
              textAlign: 'center',
              letterSpacing: 8,
              fontWeight: 600,
              outline: 'none',
              backgroundColor: '#f9fafb',
              transition: 'all 0.25s ease',
              boxShadow: ultimos4.length === 4
                ? '0 0 0 3px rgba(22,163,74,0.15)'
                : '0 4px 10px rgba(0,0,0,0.04)'
            }}
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