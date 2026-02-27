'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

const formatCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(n || 0)

export default function DashboardPage() {
  const router = useRouter()
  const [usuario, setUsuario] = useState<any>(null)
  const [planillas, setPlanillas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [fechaFiltro, setFechaFiltro] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('usuario')
    if (!stored) {
      router.push('/')
      return
    }

    const user = JSON.parse(stored)
    setUsuario(user)
    cargarPlanillas(user)
  }, [])

  const cargarPlanillas = async (user: any, fecha?: string) => {
    setLoading(true)

    let query = supabase
      .from('cuadre_planilla')
      .select(`
        *,
        personal_autorizado(id, nombre, ultimos_4, rol)
      `)
      .order('id', { ascending: false })

    if (user.rol !== 'admin') {
      query = query.eq('personal_id', user.id)
    }

    if (fecha) {
      query = query.eq('fecha', fecha)
    }

    const { data, error } = await query

    if (error) {
      alert('Error cargando planillas')
      setLoading(false)
      return
    }

    setPlanillas(data || [])
    setLoading(false)
  }

  const descargarArchivo = (buffer: ArrayBuffer, filename: string) => {
    const blob = new Blob([buffer], {
      type:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  /* EXPORTACIÓN MASIVA ADMIN */

  const exportarPlanillasCerradas = async () => {
    const cerradas = planillas.filter(p => p.cerrado)

    if (cerradas.length === 0) {
      alert('No hay planillas cerradas para exportar')
      return
    }

    const data = cerradas.map(p => ({
      Empresa: p.empresa,
      Fecha: p.fecha,
      Planilla: p.planilla_no,
      Valor: p.planilla_valor,
      Diferencia: p.diferencia_cierre,
      Usuario: p.personal_autorizado?.nombre
    }))

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cerradas')

    const buffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    })

    descargarArchivo(buffer, 'Planillas_Cerradas.xlsx')
  }

  /* EXPORTACIÓN INDIVIDUAL */

  const exportarPlanillaIndividual = async (planillaId: string) => {
    const { data: planilla } = await supabase
      .from('cuadre_planilla')
      .select('*')
      .eq('id', planillaId)
      .single()

    if (!planilla) return

    const worksheet = XLSX.utils.json_to_sheet([planilla])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Planilla')

    const buffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    })

    descargarArchivo(buffer, `Planilla_${planilla.planilla_no}.xlsx`)
  }

  if (loading) return <p>Cargando...</p>

  const totalValor = planillas.reduce(
    (acc, p) => acc + Number(p.planilla_valor || 0),
    0
  )

  const totalDiferencias = planillas
    .filter((p) => p.cerrado)
    .reduce((acc, p) => acc + Number(p.diferencia_cierre || 0), 0)

  const totalLegalizado = totalValor + totalDiferencias

  const porcentajeLegalizado =
    totalValor > 0 ? (totalLegalizado / totalValor) * 100 : 0

  return (
    <div className="page-container">
      <div className="section-card">

        {/* HEADER */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 25
        }}>
          <h2 className="section-title" style={{ margin: 0 }}>
            Dashboard de Planillas
          </h2>

          {usuario?.rol === 'admin' && (
            <button
              className="btn-secondary"
              style={{ padding: '10px 18px', fontWeight: 600 }}
              onClick={exportarPlanillasCerradas}
            >
              ⬇ Exportar Cerradas
            </button>
          )}
        </div>

        {/* NUEVA PLANILLA */}
        <div style={{ marginBottom: 30 }}>
          <button
            className="btn-primary"
            style={{ padding: '12px 22px', fontWeight: 600 }}
            onClick={() => router.push('/cuadre')}
          >
            + Nueva Planilla
          </button>
        </div>

        {/* FILTRO ADMIN */}
        {usuario?.rol === 'admin' && (
          <div style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            marginBottom: 35
          }}>
            <input
              type="date"
              value={fechaFiltro}
              onChange={(e) => setFechaFiltro(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1'
              }}
            />

            <button
              className="btn-primary"
              style={{ padding: '8px 16px' }}
              onClick={() => cargarPlanillas(usuario, fechaFiltro)}
            >
              Buscar
            </button>

            <button
              className="btn-secondary"
              style={{ padding: '8px 16px' }}
              onClick={() => {
                setFechaFiltro('')
                cargarPlanillas(usuario)
              }}
            >
              Limpiar
            </button>
          </div>
        )}

        {/* KPIs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 20,
          marginBottom: 35
        }}>
          <KpiCard title="Total Valor Planillas" value={formatCOP(totalValor)} color="#2563eb" />
          <KpiCard title="Total Legalizado" value={formatCOP(totalLegalizado)} color="#16a34a" />
          <KpiCard title="Total Diferencias" value={formatCOP(totalDiferencias)} color={totalDiferencias !== 0 ? "#dc2626" : "#16a34a"} />
          <KpiCard title="% Legalizado" value={`${porcentajeLegalizado.toFixed(2)} %`} color={porcentajeLegalizado >= 100 ? "#16a34a" : "#f59e0b"} />
        </div>

        {/* TABLA */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
              <th style={thStyle}>Empresa</th>
              <th style={thStyle}>Fecha</th>
              <th style={thStyle}>No</th>
              <th style={thStyle}>Valor</th>
              <th style={thStyle}>Estado</th>
              <th style={thStyle}>Usuario</th>
              <th style={{ ...thStyle, textAlign: 'center', width: 110 }}>Ver</th>
              <th style={{ ...thStyle, textAlign: 'center', width: 130 }}>Exportar</th>
            </tr>
          </thead>

          <tbody>
            {planillas.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={tdStyle}>{p.empresa}</td>
                <td style={tdStyle}>{p.fecha}</td>
                <td style={tdStyle}>{p.planilla_no}</td>
                <td style={tdStyle}>{formatCOP(p.planilla_valor)}</td>

                <td style={tdStyle}>
                  {p.cerrado ? (
                    <span style={{ color: '#16a34a', fontWeight: 700 }}>Cerrada</span>
                  ) : (
                    <span style={{ color: '#dc2626', fontWeight: 700 }}>Abierta</span>
                  )}
                </td>

                <td style={tdStyle}>{p.personal_autorizado?.nombre}</td>

                {/* VER */}
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <button
                    className="btn-secondary"
                    style={{ minWidth: 90 }}
                    onClick={() => router.push(`/cuadre/${p.id}/resumen`)}
                  >
                    Ver
                  </button>
                </td>

                {/* EXPORTAR */}
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  {p.cerrado && (
                    <button
                      className="btn-primary"
                      style={{ minWidth: 110 }}
                      onClick={() => exportarPlanillaIndividual(p.id)}
                    >
                      Exportar
                    </button>
                  )}
                </td>

              </tr>
            ))}
          </tbody>
        </table>

      </div>
    </div>
  )
}

function KpiCard({ title, value, color }: any) {
  return (
    <div style={{
      background: '#ffffff',
      padding: 18,
      borderRadius: 10,
      borderLeft: `6px solid ${color}`,
      boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
    }}>
      <div style={{ fontSize: 14, color: '#555' }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

const thStyle = { padding: '12px 10px', textAlign: 'left' as const }
const tdStyle = { padding: '12px 10px' }