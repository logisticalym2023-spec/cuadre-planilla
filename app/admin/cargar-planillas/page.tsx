'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

export default function CargarPlanillas() {
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState('')

  // 🔒 Normalizar fecha a formato ISO (yyyy-mm-dd)
  const normalizarFecha = (valor: any) => {
    if (!valor) return null

    if (typeof valor === 'number') {
      const fecha = XLSX.SSF.parse_date_code(valor)
      if (!fecha) return null
      return new Date(fecha.y, fecha.m - 1, fecha.d)
        .toISOString()
        .split('T')[0]
    }

    if (typeof valor === 'string') {
      const fechaDirecta = new Date(valor)
      if (!isNaN(fechaDirecta.getTime())) {
        return fechaDirecta.toISOString().split('T')[0]
      }

      const partes = valor.split('/')
      if (partes.length === 3) {
        const [dia, mes, anio] = partes
        return new Date(
          Number(anio),
          Number(mes) - 1,
          Number(dia)
        )
          .toISOString()
          .split('T')[0]
      }
    }

    return null
  }

  const handleFileUpload = async (e: any) => {
    const file = e.target.files[0]
    if (!file) return

    setLoading(true)
    setMensaje('Procesando archivo...')

    const reader = new FileReader()

    reader.onload = async (evt: any) => {
      const data = new Uint8Array(evt.target.result)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null })

      if (rows.length === 0) {
        setMensaje('El archivo está vacío')
        setLoading(false)
        return
      }

      let insertadas = 0
      let errores = 0
      let invalidas = 0

      for (const row of rows) {
        const fechaISO = normalizarFecha(row.fecha)
        const planillaNo = String(row.planilla_no || '').trim()

        // 🔥 LIMPIEZA CORRECTA DEL VALOR
        const valorLimpio = String(row.valor || '')
          .replace(/\./g, '')     // quitar puntos de miles
          .replace(',', '.')      // por si viene coma decimal
          .trim()

        const valorNumero = Number(valorLimpio)

        if (!fechaISO || !planillaNo) {
          console.log('FILA INVÁLIDA:', row)
          invalidas++
          continue
        }

        if (isNaN(valorNumero)) {
          console.log('VALOR INVÁLIDO:', row.valor, 'FILA:', row)
          invalidas++
          continue
        }

        const { error } = await supabase
          .from('planillas_oficiales')
          .insert({
            fecha: fechaISO,
            planilla_no: planillaNo,
            valor: valorNumero
          })

        if (error) {
          console.log('ERROR INSERT:', error, 'FILA:', row)
          errores++
        } else {
          insertadas++
        }
      }

      setMensaje(`
Proceso finalizado:
Total filas: ${rows.length}
Insertadas: ${insertadas}
Errores: ${errores}
Inválidas: ${invalidas}
      `)

      setLoading(false)
    }

    reader.readAsArrayBuffer(file)
  }

  return (
    <div className="page-container">
      <div className="section-card">
        <h2>Cargar Planillas Oficiales (Excel)</h2>

        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileUpload}
        />

        {loading && <p>Cargando...</p>}
        {mensaje && (
          <pre style={{ marginTop: 20 }}>
            {mensaje}
          </pre>
        )}
      </div>
    </div>
  )
}