'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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

    // 🔥 AHORA TRAEMOS BILLETES
    const { data: billetes } = await supabase
      .from('cuadre_billetes')
      .select('total')
      .eq('cuadre_id', id)

    // 🔥 Y TAMBIÉN MONEDAS
    const { data: monedas } = await supabase
      .from('cuadre_monedas')
      .select('total')
      .eq('cuadre_id', id)

    const totalBilletes = (billetes || []).reduce(
      (acc, item) => acc + Number(item.total),
      0
    )

    const totalMonedas = (monedas || []).reduce(
      (acc, item) => acc + Number(item.total),
      0
    )

    const total = totalBilletes + totalMonedas

    setTotalEfectivo(total)
    setPlanilla(data)
    setLoading(false)
  }

  if (loading) return <p>Cargando...</p>
  if (!planilla) return <p>No se encontró la planilla</p>

  const planillaValor = Number(planilla.planilla_valor || 0)
  const agotado = Number(planilla.agotado || 0)

  const planillaAjustada =
    agotado > planillaValor
      ? 0
      : planillaValor - agotado

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
    Number(planilla.descuento_clientes || 0)

  const diferencia = totalLegalizado - planillaAjustada

  const cerrarPlanilla = async () => {
    const { error } = await supabase
      .from('cuadre_planilla')
      .update({ cerrado: true })
      .eq('id', id)

    if (error) {
      alert('Error cerrando planilla')
      return
    }

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

        <br />

        <p>Dev Buena: {formatCOP(planilla.dev_paseo)}</p>
        <p>Dev Mala: {formatCOP(planilla.dev_mala)}</p>
        <p>Brinks: {formatCOP(planilla.consignacion_brinks)}</p>
        <p>Banco: {formatCOP(planilla.consignacion_banco)}</p>
        <p>Redespacho: {formatCOP(planilla.redespacho_manana)}</p>

        <p>Peajes: {formatCOP(planilla.peajes)}</p>
        <p>Combustible: {formatCOP(planilla.combustible)}</p>
        <p>Fletes: {formatCOP(planilla.fletes)}</p>
        <p>Acompañamiento: {formatCOP(planilla.acompanamiento)}</p>
        <p>Gasto Oficina: {formatCOP(planilla.gasto_oficina)}</p>
        <p>Descuento Clientes: {formatCOP(planilla.descuento_clientes)}</p>

        <hr />

        <h3>Total Legalizado: {formatCOP(totalLegalizado)}</h3>

        <h3
          className={
            diferencia === 0
              ? 'text-green-600'
              : diferencia > 0
              ? 'text-green-600'
              : 'text-red-600'
          }
        >
          Diferencia: {formatCOP(diferencia)}
        </h3>

        {diferencia === 0 && (
          <p className="text-green-600 font-bold">
            CUADRE PERFECTO
          </p>
        )}

        {diferencia > 0 && (
          <p className="text-green-600 font-bold">
            SOBRA DINERO
          </p>
        )}

        {diferencia < 0 && (
          <p className="text-red-600 font-bold">
            FALTA DINERO
          </p>
        )}

        <br />

        <div style={{ display: 'flex', gap: 15 }}>
          <button
            className="btn-secondary"
            onClick={() => router.push(`/cuadre/${id}/novedades`)}
          >
            ← Volver
          </button>

          {diferencia === 0 && (
            <button
              className="btn-primary"
              onClick={cerrarPlanilla}
            >
              Cerrar Planilla
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
