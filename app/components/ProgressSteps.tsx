'use client'

import { usePathname } from 'next/navigation'

const steps = [
  { name: 'Monedas', path: 'monedas' },
  { name: 'Billetes', path: 'billetes' },
  { name: 'Novedades', path: 'novedades' },
  { name: 'Resumen', path: 'resumen' }
]

export default function ProgressSteps() {
  const pathname = usePathname()

  if (!pathname.includes('/cuadre/')) return null

  const currentIndex = steps.findIndex(step =>
    pathname.includes(step.path)
  )

  return (
    <div style={{ marginTop: 20 }}>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 8
        }}
      >
        {steps.map((step, index) => (
          <div
            key={step.name}
            style={{
              fontWeight: index === currentIndex ? 700 : 500,
              color: index <= currentIndex ? '#ffffff' : 'rgba(255,255,255,0.6)'
            }}
          >
            {step.name}
          </div>
        ))}
      </div>

      <div
        style={{
          height: 6,
          background: 'rgba(255,255,255,0.3)',
          borderRadius: 6,
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            width: `${((currentIndex + 1) / steps.length) * 100}%`,
            height: '100%',
            background: '#ffffff',
            transition: 'width 0.3s ease'
          }}
        />
      </div>

    </div>
  )
}
