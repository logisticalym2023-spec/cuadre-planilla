import './globals.css'
import HeaderClient from './components/HeaderClient'
import ProgressSteps from './components/ProgressSteps'

export const metadata = {
  title: 'Sistema de Cuadre - Provisión L&M',
  description: 'Sistema interno de control y cuadre de planillas',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        <div className="app-wrapper">

          {/* HEADER CORPORATIVO */}
          <header className="app-header">
            <div
              className="header-content"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >

              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <img
                  src="/logo.png"
                  alt="Logo Provisión L&M"
                  style={{ height: '80px' }}
                />

                <div>
                  <h1 className="app-title">
                    Sistema de Cuadre de Planillas
                  </h1>
                  <p className="app-subtitle">
                    Agencia Comercial
                  </p>
                </div>
              </div>

              {/* Usuario + Cerrar sesión */}
              <HeaderClient />

            </div>

            {/* Barra de progreso */}
            <ProgressSteps />

          </header>

          <main className="app-main">
            {children}
          </main>

        </div>
      </body>
    </html>
  )
}
