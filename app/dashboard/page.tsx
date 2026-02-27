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

  /* ============================
     EXPORTACIÓN MASIVA
  ============================ */

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

  /* ============================
     EXPORTACIÓN INDIVIDUAL COMPLETA
  ============================ */

  const exportarPlanillaIndividual = async (planillaId: string) => {

    const { data: planilla } = await supabase
      .from('cuadre_planilla')
      .select('*')
      .eq('id', planillaId)
      .single()

    if (!planilla) return

    const { data: billetes } = await supabase
      .from('cuadre_billetes')
      .select('*')
      .eq('cuadre_id', planillaId)

    const { data: monedas } = await supabase
      .from('cuadre_monedas')
      .select('*')
      .eq('cuadre_id', planillaId)

    const dataExcel: any[] = []

    // DATOS GENERALES
    dataExcel.push({ Campo: 'Empresa', Valor: planilla.empresa })
    dataExcel.push({ Campo: 'Fecha', Valor: planilla.fecha })
    dataExcel.push({ Campo: 'Vehículo', Valor: planilla.vehiculo })
    dataExcel.push({ Campo: 'Planilla No', Valor: planilla.planilla_no })
    dataExcel.push({ Campo: '', Valor: '' })

    dataExcel.push({ Campo: 'Valor Planilla', Valor: Number(planilla.planilla_valor || 0) })
    dataExcel.push({ Campo: 'Agotado', Valor: Number(planilla.agotado || 0) })
    dataExcel.push({ Campo: '', Valor: '' })

    // RUBROS
    dataExcel.push({ Campo: 'Dev Buena', Valor: Number(planilla.dev_paseo || 0) })
    dataExcel.push({ Campo: 'Dev Mala', Valor: Number(planilla.dev_mala || 0) })
    dataExcel.push({ Campo: 'Consignación Brinks', Valor: Number(planilla.consignacion_brinks || 0) })
    dataExcel.push({ Campo: 'Consignación Banco', Valor: Number(planilla.consignacion_banco || 0) })
    dataExcel.push({ Campo: 'Redespacho Mañana', Valor: Number(planilla.redespacho_manana || 0) })
    dataExcel.push({ Campo: 'Peajes', Valor: Number(planilla.peajes || 0) })
    dataExcel.push({ Campo: 'Combustible', Valor: Number(planilla.combustible || 0) })
    dataExcel.push({ Campo: 'Fletes', Valor: Number(planilla.fletes || 0) })
    dataExcel.push({ Campo: 'Acompañamiento', Valor: Number(planilla.acompanamiento || 0) })
    dataExcel.push({ Campo: 'Gasto Oficina', Valor: Number(planilla.gasto_oficina || 0) })
    dataExcel.push({ Campo: 'Descuento Clientes', Valor: Number(planilla.descuento_clientes || 0) })
    dataExcel.push({ Campo: 'Vale', Valor: Number(planilla.vale || 0) })
    dataExcel.push({ Campo: '', Valor: '' })

    // DETALLE BILLETES
    dataExcel.push({ Campo: '--- DETALLE BILLETES ---', Valor: '' })

    ;(billetes || []).forEach((b: any) => {
      dataExcel.push({
        Campo: `Billete ${b.denominacion}`,
        Valor: `Cantidad: ${b.cantidad} | Total: ${b.total}`
      })
    })

    dataExcel.push({ Campo: '', Valor: '' })

    // DETALLE MONEDAS
    dataExcel.push({ Campo: '--- DETALLE MONEDAS ---', Valor: '' })

    ;(monedas || []).forEach((m: any) => {
      dataExcel.push({
        Campo: `Moneda ${m.denominacion}`,
        Valor: `Cantidad: ${m.cantidad} | Total: ${m.total}`
      })
    })

    dataExcel.push({ Campo: '', Valor: '' })

    dataExcel.push({
      Campo: 'TOTAL LEGALIZADO',
      Valor: Number(planilla.planilla_valor || 0) + Number(planilla.diferencia_cierre || 0)
    })

    dataExcel.push({
      Campo: 'DIFERENCIA',
      Valor: Number(planilla.diferencia_cierre || 0)
    })

    const worksheet = XLSX.utils.json_to_sheet(dataExcel)
    worksheet['!cols'] = [{ wch: 35 }, { wch: 30 }]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resumen')

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

        <h2 className="section-title">Dashboard de Planillas</h2>

        {/* FILTRO */}
        {usuario?.rol === 'admin' && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 30 }}>
            <input
              type="date"
              value={fechaFiltro}
              onChange={(e) => setFechaFiltro(e.target.value)}
            />
            <button
              className="btn-primary"
              onClick={() => cargarPlanillas(usuario, fechaFiltro)}
            >
              Buscar
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                setFechaFiltro('')
                cargarPlanillas(usuario)
              }}
            >
              Limpiar
            </button>
            <button
              className="btn-secondary"
              onClick={exportarPlanillasCerradas}
            >
              ⬇ Exportar Cerradas
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
            <tr>
              <th style={thStyle}>Empresa</th>
              <th style={thStyle}>Fecha</th>
              <th style={thStyle}>No</th>
              <th style={thStyle}>Valor</th>
              <th style={thStyle}>Estado</th>
              <th style={thStyle}>Usuario</th>
              <th style={thStyle}></th>
            </tr>
          </thead>

          <tbody>
            {planillas.map((p) => (
              <tr key={p.id}>
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
                <td style={tdStyle}>
                  <button
                    className="btn-secondary"
                    onClick={() => router.push(`/cuadre/${p.id}/resumen`)}
                  >
                    Ver
                  </button>
                  {p.cerrado && (
                    <button
                      className="btn-primary"
                      style={{ marginLeft: 10 }}
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