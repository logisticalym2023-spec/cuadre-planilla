'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function HeaderClient() {
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const pathname = usePathname()

  const cargarUsuario = () => {
    const storedUser = localStorage.getItem('usuario')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    } else {
      setUser(null)
    }
  }

  useEffect(() => {
    cargarUsuario()
  }, [pathname]) // 👈 CLAVE: se ejecuta cuando cambia la ruta

  const handleLogout = () => {
    localStorage.removeItem('usuario')
    setUser(null)
    router.push('/')
  }

  // No mostrar en login
  if (pathname === '/') return null
  if (!user) return null

  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 14, marginBottom: 6 }}>
        <strong>{user.nombre}</strong><br />
        Código: {user.ultimos_4} | Rol: {user.rol}
      </div>

      <button
        onClick={handleLogout}
        style={{
          background: '#c62828',
          color: '#fff',
          padding: '8px 14px',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer'
        }}
      >
        Cerrar sesión
      </button>
    </div>
  )
}
