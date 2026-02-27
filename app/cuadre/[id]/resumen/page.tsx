'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

const formatCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(n || 0)

export default function ResumenPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [planilla, setPlanilla] = useState<any>(null)
  const [totalEfectivo, setTotalEfectivo] = useState(0)
  const [billetesDetalle, setBilletesDetalle] = useState<any[]>([])
  const [monedasDetalle, setMonedasDetalle] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) cargarDatos()
  }, [id])

  const cargarDatos = async () => {
    const { data } = await supabase
      .from('cuadre_planilla')
      .select('*')
      .eq('id', id)
      .single()

    const { data: billetes } = await supabase
      .from('cuadre_billetes')
      .select('*')
      .eq('cuadre_id', id)

    const { data: monedas } = await supabase
      .from('cuadre_monedas')
      .select('*')
      .eq('cuadre_id', id)

    const totalBilletes = (billetes || []).reduce(
      (acc, item) => acc + Number(item.total),
      0
    )

    const totalMonedas = (monedas || []).reduce(
      (acc, item) => acc + Number(item.total),
      0
    )

    setTotalEfectivo(totalBilletes + totalMonedas)
    setBilletesDetalle(billetes || [])
    setMonedasDetalle(monedas || [])
    setPlanilla(data)
    setLoading(false)
  }

  if (loading) return <p>Cargando...</p>
  if (!planilla) return <p>No se encontró la planilla</p>

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

  const tolerancia = 500
  const puedeCerrar =
    diferencia >= -tolerancia && diferencia <= tolerancia

  const exportarExcel = () => {
    const data: any[] = []

    data.push({ Campo: 'Empresa', Valor: planilla.empresa })
    data.push({ Campo: 'Vehículo', Valor: planilla.vehiculo })
    data.push({ Campo: 'Planilla No', Valor: planilla.planilla_no })
    data.push({ Campo: 'Fecha', Valor: planilla.fecha })
    data.push({ Campo: '', Valor: '' })

    data.push({ Campo: 'Valor Planilla', Valor: planillaValor })
    data.push({ Campo: 'Agotado', Valor: agotado })
    data.push({ Campo: 'Planilla Ajustada', Valor: planillaAjustada })
    data.push({ Campo: '', Valor: '' })

    data.push({ Campo: 'Total Efectivo', Valor: totalEfectivo })
    data.push({ Campo: '', Valor: '' })
    data.push({ Campo: 'DETALLE BILLETES', Valor: '' })

    billetesDetalle.forEach((b) => {
      data.push({
        Campo: `Billete ${b.denominacion} x ${b.cantidad}`,
        Valor: b.total
      })
    })

    data.push({ Campo: '', Valor: '' })
    data.push({ Campo: 'DETALLE MONEDAS', Valor: '' })

    monedasDetalle.forEach((m) => {
      data.push({
        Campo: `Moneda ${m.denominacion} x ${m.cantidad}`,
        Valor: m.total
      })
    })

    data.push({ Campo: '', Valor: '' })
    data.push({ Campo: 'NOVEDADES', Valor: '' })

    data.push({ Campo: 'Dev Buena', Valor: Number(planilla.dev_paseo || 0) })
    data.push({ Campo: 'Dev Mala', Valor: Number(planilla.dev_mala || 0) })
    data.push({ Campo: 'Brinks', Valor: Number(planilla.consignacion_brinks || 0) })
    data.push({ Campo: 'Banco', Valor: Number(planilla.consignacion_banco || 0) })
    data.push({ Campo: 'Redespacho', Valor: Number(planilla.redespacho_manana || 0) })
    data.push({ Campo: 'Peajes', Valor: Number(planilla.peajes || 0) })
    data.push({ Campo: 'Combustible', Valor: Number(planilla.combustible || 0) })
    data.push({ Campo: 'Fletes', Valor: Number(planilla.fletes || 0) })
    data.push({ Campo: 'Acompañamiento', Valor: Number(planilla.acompanamiento || 0) })
    data.push({ Campo: 'Gasto Oficina', Valor: Number(planilla.gasto_oficina || 0) })
    data.push({ Campo: 'Descuento Clientes', Valor: Number(planilla.descuento_clientes || 0) })
    data.push({ Campo: 'Vale', Valor: Number(planilla.vale || 0) })
    data.push({ Campo: '', Valor: '' })

    data.push({ Campo: 'TOTAL LEGALIZADO', Valor: totalLegalizado })
    data.push({ Campo: 'DIFERENCIA', Valor: diferencia })
    data.push({ Campo: 'Cierre con Tolerancia', Valor: diferencia !== 0 ? 'SI' : 'NO' })

    const worksheet = XLSX.utils.json_to_sheet(data)
    worksheet['!cols'] = [{ wch: 30 }, { wch: 20 }]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resumen')

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    })

    const file = new Blob([excelBuffer], {
      type: 'application/octet-stream'
    })

    saveAs(file, `Planilla_${planilla.planilla_no}.xlsx`)
  }

  const cerrarYExportar = async () => {
    const cierreConTolerancia = diferencia !== 0

    const { error } = await supabase
      .from('cuadre_planilla')
      .update({
        cerrado: true,
        diferencia_cierre: diferencia,
        cierre_con_tolerancia: cierreConTolerancia
      })
      .eq('id', id)

    if (error) {
      alert('Error cerrando planilla')
      return
    }

    exportarExcel()
    router.push('/')
  }

  return (
    <div className="page-container">
      <div className="section-card">

        <h2 className="section-title">Resumen de Planilla</h2>

        <p><strong>Empresa:</strong> {planilla.empresa}</p>
        <p><strong>Vehículo:</strong> {planilla.vehiculo}</p>
        <p><strong>Planilla No:</strong> {planilla.planilla_no}</p>

        <hr />

        <p><strong>Valor Planilla:</strong> {formatCOP(planillaValor)}</p>
        <p><strong>Agotado:</strong> {formatCOP(agotado)}</p>
        <p><strong>Planilla Ajustada:</strong> {formatCOP(planillaAjustada)}</p>

        <hr />

        <p><strong>Total Efectivo:</strong> {formatCOP(totalEfectivo)}</p>

        <div style={{ marginTop: 10 }}>
          <h4>Detalle Billetes</h4>
          {billetesDetalle.map((b) => (
            <p key={b.id}>
              {formatCOP(b.denominacion)} x {b.cantidad} = {formatCOP(b.total)}
            </p>
          ))}

          <h4 style={{ marginTop: 10 }}>Detalle Monedas</h4>
          {monedasDetalle.map((m) => (
            <p key={m.id}>
              {formatCOP(m.denominacion)} x {m.cantidad} = {formatCOP(m.total)}
            </p>
          ))}
        </div>

        <hr />

        <h3><strong>Total Legalizado:</strong> {formatCOP(totalLegalizado)}</h3>

        <h3 className={puedeCerrar ? 'text-green-600' : 'text-red-600'}>
          <strong>Diferencia:</strong> {formatCOP(diferencia)}
        </h3>

        <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
          <button
            className="btn-secondary"
            onClick={() => router.push(`/cuadre/${id}/novedades`)}
          >
            Volver
          </button>

          {puedeCerrar && (
            <button
              className="btn-primary"
              onClick={cerrarYExportar}
            >
              Cerrar Planilla y Exportar
            </button>
          )}
        </div>

      </div>
    </div>
  )
}