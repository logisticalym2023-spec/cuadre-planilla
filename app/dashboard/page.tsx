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

  const cargarPlanillas = async (user: any) => {
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

    const { data, error } = await query

    if (error) {
      console.log(error)
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
    window.URL.revokeObjectURL(url)
  }

  const exportarExcel = async () => {
    if (usuario?.rol !== 'admin') return

    const cerradas = planillas.filter((p) => p.cerrado)

    if (cerradas.length === 0) {
      alert('No hay planillas cerradas para exportar')
      return
    }

    const ids = cerradas.map((p) => p.id)

    const { data: billetesData, error: errorBilletes } = await supabase
      .from('cuadre_billetes')
      .select('*')
      .in('cuadre_id', ids)

    const { data: monedasData, error: errorMonedas } = await supabase
      .from('cuadre_monedas')
      .select('*')
      .in('cuadre_id', ids)

    if (errorBilletes || errorMonedas) {
      console.error(errorBilletes || errorMonedas)
      alert('Error cargando billetes y monedas')
      return
    }

    const dataExcel = cerradas.map((p) => {
      const billetes =
        billetesData
          ?.filter((b) => b.cuadre_id === p.id)
          .map((b) => `${b.denominacion} x ${b.cantidad}`)
          .join(' | ') || ''

      const monedas =
        monedasData
          ?.filter((m) => m.cuadre_id === p.id)
          .map((m) => `${m.denominacion} x ${m.cantidad}`)
          .join(' | ') || ''

      return {
        Empresa: p.empresa,
        Fecha: p.fecha,
        Vehiculo: p.vehiculo,
        Planilla_No: p.planilla_no,
        Valor_Planilla: Number(p.planilla_valor || 0),

        Monedas: monedas,
        Billetes: billetes,

        Agotado: Number(p.agotado || 0),

        Dev_Buena: Number(p.dev_paseo || 0),
        Dev_Mala: Number(p.dev_mala || 0),
        Consignacion_Brinks: Number(p.consignacion_brinks || 0),
        Consignacion_Banco: Number(p.consignacion_banco || 0),
        Redespacho: Number(p.redespacho_manana || 0),

        Peajes: Number(p.peajes || 0),
        Combustible: Number(p.combustible || 0),
        Fletes: Number(p.fletes || 0),
        Acompanamiento: Number(p.acompanamiento || 0),
        Gasto_Oficina: Number(p.gasto_oficina || 0),
        Descuento_Clientes: Number(p.descuento_clientes || 0),

        Usuario: p.personal_autorizado?.nombre || '',
        Codigo_Usuario: p.personal_autorizado?.ultimos_4 || '',
        Rol: p.personal_autorizado?.rol || '',
        Estado: 'Cerrada'
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(dataExcel)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Planillas Cerradas')

    worksheet['!cols'] = Object.keys(dataExcel[0] || {}).map(() => ({
      wch: 20
    }))

    const arrayBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    })

    const fecha = new Date().toISOString().slice(0, 10)
    descargarArchivo(arrayBuffer, `Planillas_Cerradas_${fecha}.xlsx`)
  }

  if (loading) return <p>Cargando...</p>

  const totalPlanillas = planillas.length
  const abiertas = planillas.filter((p) => !p.cerrado).length
  const cerradas = planillas.filter((p) => p.cerrado).length
  const totalValor = planillas.reduce(
    (acc, p) => acc + Number(p.planilla_valor || 0),
    0
  )

  return (
    <div className="page-container">
      <div className="section-card">
        <h2 className="section-title">Dashboard de Planillas</h2>

        <div style={{ display: 'flex', gap: 30, marginBottom: 30 }}>
          <div><strong>Total:</strong> {totalPlanillas}</div>
          <div><strong>Abiertas:</strong> {abiertas}</div>
          <div><strong>Cerradas:</strong> {cerradas}</div>
          <div><strong>Valor Total:</strong> {formatCOP(totalValor)}</div>
        </div>

        <div style={{ display: 'flex', gap: 15, marginBottom: 20 }}>
          <button className="btn-primary" onClick={() => router.push('/cuadre')}>
            + Nueva Planilla
          </button>

          {usuario?.rol === 'admin' && (
            <button className="btn-secondary" onClick={exportarExcel}>
              Exportar Planillas Cerradas
            </button>
          )}
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
              <th>Empresa</th>
              <th>Fecha</th>
              <th>No</th>
              <th>Valor</th>
              <th>Estado</th>
              <th>Usuario</th>
              <th>Código</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {planillas.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td>{p.empresa}</td>
                <td>{p.fecha}</td>
                <td>{p.planilla_no}</td>
                <td>{formatCOP(p.planilla_valor)}</td>

                <td>
                  {p.cerrado ? (
                    <span style={{ color: '#2e8b57', fontWeight: 600 }}>
                      Cerrada
                    </span>
                  ) : (
                    <span style={{ color: '#dc2626', fontWeight: 600 }}>
                      Abierta
                    </span>
                  )}
                </td>

                <td>{p.personal_autorizado?.nombre}</td>
                <td>{p.personal_autorizado?.ultimos_4}</td>

                <td>
                  <button
                    className="btn-secondary"
                    onClick={() => router.push(`/cuadre/${p.id}/resumen`)}
                  >
                    Ver
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
