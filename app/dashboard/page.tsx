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
      .select(`*, personal_autorizado(id, nombre, ultimos_4, rol)`)
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
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  /* EXPORTACIONES (SIN CAMBIOS) */

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

    const totalBilletes = (billetes || []).reduce(
      (acc, item) => acc + Number(item.total), 0
    )

    const totalMonedas = (monedas || []).reduce(
      (acc, item) => acc + Number(item.total), 0
    )

    const totalEfectivo = totalBilletes + totalMonedas

    const planillaValor = Number(planilla.planilla_valor || 0)
    const agotado = Number(planilla.agotado || 0)
    const vale = Number(planilla.vale || 0)

    const planillaAjustada =
      agotado > planillaValor ? 0 : planillaValor - agotado

    const totalLegalizado =
      totalEfectivo +
      Number(planilla.dev_paseo || 0) +
      Number(planilla.dev_mala || 0) +
      Number(planilla.consignacion_brinks || 0) +
      Number(planilla.consignacion_banco || 0) +
      Number(planilla.redespacho_manana || 0) +
      Number(planilla.peajes || 0) +
      Number(planilla.combustible || 0) +
      Number(planilla.fletes || 0) +
      Number(planilla.acompanamiento || 0) +
      Number(planilla.gasto_oficina || 0) +
      Number(planilla.descuento_clientes || 0) +
      vale

    const diferencia = totalLegalizado - planillaAjustada

    const dataExcel: any[] = []

    dataExcel.push({ Campo: 'Empresa', Valor: planilla.empresa })
    dataExcel.push({ Campo: 'Vehículo', Valor: planilla.vehiculo })
    dataExcel.push({ Campo: 'Planilla No', Valor: planilla.planilla_no })
    dataExcel.push({ Campo: 'Fecha', Valor: planilla.fecha })
    dataExcel.push({ Campo: '', Valor: '' })

    dataExcel.push({ Campo: 'Valor Planilla', Valor: planillaValor })
    dataExcel.push({ Campo: 'Agotado', Valor: agotado })
    dataExcel.push({ Campo: 'Planilla Ajustada', Valor: planillaAjustada })
    dataExcel.push({ Campo: '', Valor: '' })

    dataExcel.push({ Campo: 'Total Efectivo', Valor: totalEfectivo })
    dataExcel.push({ Campo: '', Valor: '' })

    dataExcel.push({ Campo: 'DETALLE BILLETES', Valor: '' })
    ;(billetes || []).forEach(b => {
      dataExcel.push({
        Campo: `Billete ${b.denominacion} x ${b.cantidad}`,
        Valor: b.total
      })
    })

    dataExcel.push({ Campo: '', Valor: '' })
    dataExcel.push({ Campo: 'DETALLE MONEDAS', Valor: '' })
    ;(monedas || []).forEach(m => {
      dataExcel.push({
        Campo: `Moneda ${m.denominacion} x ${m.cantidad}`,
        Valor: m.total
      })
    })

    dataExcel.push({ Campo: '', Valor: '' })
    dataExcel.push({ Campo: 'NOVEDADES', Valor: '' })

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
    dataExcel.push({ Campo: 'TOTAL LEGALIZADO', Valor: totalLegalizado })
    dataExcel.push({ Campo: 'DIFERENCIA', Valor: diferencia })

    const worksheet = XLSX.utils.json_to_sheet(dataExcel)
    worksheet['!cols'] = [{ wch: 35 }, { wch: 22 }]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resumen')

    const buffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    })

    descargarArchivo(buffer, `Planilla_${planilla.planilla_no}.xlsx`)
  }

  if (loading) return <p style={{ padding: 40 }}>Cargando...</p>

  const totalValor = planillas.reduce(
    (acc, p) => acc + Number(p.planilla_valor || 0), 0
  )

  const totalDiferencias = planillas
    .filter(p => p.cerrado)
    .reduce((acc, p) => acc + Number(p.diferencia_cierre || 0), 0)

  const totalLegalizado = totalValor + totalDiferencias

  const porcentajeLegalizado =
    totalValor > 0 ? (totalLegalizado / totalValor) * 100 : 0

  return (
    <div style={{
      padding: 40,
      background: '#f4f6f9',
      minHeight: '100vh'
    }}>
      <div style={{
        background: '#fff',
        padding: 30,
        borderRadius: 12,
        boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
      }}>

        <h2 style={{
          fontSize: 22,
          fontWeight: 700,
          marginBottom: 25
        }}>
          Dashboard de Planillas
        </h2>

        <div style={{ marginBottom: 25 }}>
          <button style={btnGreen} onClick={() => router.push('/cuadre')}>
            + Nueva Planilla
          </button>
        </div>

        {usuario?.rol === 'admin' && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 30 }}>
            <input
              type="date"
              value={fechaFiltro}
              onChange={(e) => setFechaFiltro(e.target.value)}
              style={inputStyle}
            />
            <button style={btnGreen} onClick={() => cargarPlanillas(usuario, fechaFiltro)}>
              Buscar
            </button>
            <button style={btnBlue} onClick={() => {
              setFechaFiltro('')
              cargarPlanillas(usuario)
            }}>
              Limpiar
            </button>
            <button style={btnBlue} onClick={exportarPlanillasCerradas}>
              ⬇ Exportar Cerradas
            </button>
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))',
          gap: 20,
          marginBottom: 35
        }}>
          <KpiCard title="Total Valor Planillas" value={formatCOP(totalValor)} />
          <KpiCard title="Total Legalizado" value={formatCOP(totalLegalizado)} />
          <KpiCard title="Total Diferencias" value={formatCOP(totalDiferencias)} />
          <KpiCard title="% Legalizado" value={`${porcentajeLegalizado.toFixed(2)} %`} />
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f1f5f9' }}>
            <tr>
              <th style={thStyle}>Empresa</th>
              <th style={thStyle}>Fecha</th>
              <th style={thStyle}>No</th>
              <th style={thStyle}>Valor</th>
              <th style={thStyle}>Estado</th>
              <th style={thStyle}>Usuario</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {planillas.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={tdStyle}>{p.empresa}</td>
                <td style={tdStyle}>{p.fecha}</td>
                <td style={tdStyle}>{p.planilla_no}</td>
                <td style={tdStyle}>{formatCOP(p.planilla_valor)}</td>
                <td style={tdStyle}>
                  <span style={{
                    padding: '6px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    background: p.cerrado ? '#dcfce7' : '#fee2e2',
                    color: p.cerrado ? '#166534' : '#991b1b'
                  }}>
                    {p.cerrado ? 'Cerrada' : 'Abierta'}
                  </span>
                </td>
                <td style={tdStyle}>{p.personal_autorizado?.nombre}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  <button style={btnBlue} onClick={() => router.push(`/cuadre/${p.id}/resumen`)}>
                    Ver
                  </button>
                  {p.cerrado && (
                    <button style={{ ...btnGreen, marginLeft: 8 }} onClick={() => exportarPlanillaIndividual(p.id)}>
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

function KpiCard({ title, value }: any) {
  return (
    <div style={{
      background: '#fff',
      padding: 18,
      borderRadius: 10,
      boxShadow: '0 4px 14px rgba(0,0,0,0.05)'
    }}>
      <div style={{ fontSize: 13, color: '#6b7280' }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  )
}

const btnGreen = {
  background: '#16a34a',
  color: '#fff',
  padding: '8px 16px',
  borderRadius: 8,
  border: 'none',
  fontWeight: 600,
  cursor: 'pointer'
}

const btnBlue = {
  background: '#2563eb',
  color: '#fff',
  padding: '8px 16px',
  borderRadius: 8,
  border: 'none',
  fontWeight: 600,
  cursor: 'pointer'
}

const inputStyle = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #d1d5db'
}

const thStyle = {
  padding: 14,
  textAlign: 'left' as const,
  fontWeight: 600,
  fontSize: 14
}

const tdStyle = {
  padding: 14,
  fontSize: 14
}