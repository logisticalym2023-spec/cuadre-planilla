'use client'

import { ArrowLeftOnRectangleIcon } from '@heroicons/react/24/solid'

export default function LogoutButton() {

  const cerrarSesion = () => {
    localStorage.removeItem('usuario')
    window.location.href = '/'
  }

  return (
    <button
      className="btn-secondary"
      onClick={cerrarSesion}
      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
    >
      <ArrowLeftOnRectangleIcon style={{ width: 18 }} />
      Cerrar Sesión
    </button>
  )
}