'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

export default function CargarPlanillas() {
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState('')

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
      const rows: any[] = XLSX.utils.sheet_to_json(sheet)

      if (rows.length === 0) {
        setMensaje('El archivo está vacío')
        setLoading(false)
        return
      }

      let insertadas = 0
      let duplicadas = 0

      for (const row of rows) {
        const { error } = await supabase
          .from('planillas_oficiales')
          .insert({
            fecha: row.fecha,
            planilla_no: String(row.planilla_no),
            valor: Number(row.valor)
          })

        if (error) {
          duplicadas++
        } else {
          insertadas++
        }
      }

      setMensaje(`
        Proceso finalizado:
        Total filas: ${rows.length}
        Insertadas: ${insertadas}
        Duplicadas: ${duplicadas}
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