import { useState, useEffect, useMemo } from 'react'
import { jsPDF } from 'jspdf'
import { buildContractText } from './buildContractText.js'

const styles = {
  box: { maxWidth: 560, marginBottom: 16 },
  h2: { fontSize: 18, fontWeight: 700, marginBottom: 16 },
  label: { display: 'block', fontSize: 12, color: '#9ab5ad', marginBottom: 4 },
  select: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 12px',
    marginBottom: 14,
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    background: 'rgba(0,0,0,0.2)',
    color: '#f0f0f0',
    fontSize: 14,
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 12px',
    marginBottom: 14,
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    background: 'rgba(0,0,0,0.2)',
    color: '#f0f0f0',
    fontSize: 14,
  },
  btn: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: 8,
    background: '#349980',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    marginRight: 8,
    marginTop: 8,
  },
  btnSec: { background: 'rgba(255,255,255,0.15)' },
  noStudents: { fontSize: 13, color: '#9ab5ad', marginBottom: 16 },
}

function defaultOptionsFromTemplate(optionals) {
  if (!Array.isArray(optionals)) return { valor: 'R$ 0,00', incluirMulta: false }
  const opts = {}
  optionals.forEach((o) => {
    if (o && o.key) {
      opts[o.key] = o.type === 'boolean' ? false : ''
      if (o.key === 'valor') opts[o.key] = 'R$ 0,00'
    }
  })
  return Object.keys(opts).length ? opts : { valor: 'R$ 0,00', incluirMulta: false }
}

const FALLBACK_BODY = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE PILATES\n\nCONTRATANTE: {{RAZAO_SOCIAL}}\nCONTRATADO: {{ALUNO_NOME}}\nVALOR: {{VALOR}}\nData: {{DATA}}`

export default function GerarContrato({ user }) {
  const [students, setStudents] = useState([])
  const [studio, setStudio] = useState(null)
  const [template, setTemplate] = useState(null)
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [options, setOptions] = useState({ valor: 'R$ 0,00', incluirMulta: false })

  useEffect(() => {
    const token = user?.token
    if (!token) return
    Promise.all([
      fetch(`${window.location.origin}/api/contratos-studio`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(`${window.location.origin}/api/contratos-students`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(`${window.location.origin}/api/contratos-template`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ]).then(([studioRes, studentsRes, templateRes]) => {
      if (studioRes.studio) setStudio(studioRes.studio)
      if (Array.isArray(studentsRes.students)) {
        setStudents(studentsRes.students)
        if (studentsRes.students.length && !selectedStudentId) setSelectedStudentId(String(studentsRes.students[0].id))
      }
      if (templateRes.template?.body != null) {
        setTemplate(templateRes.template)
        setOptions((prev) => ({ ...defaultOptionsFromTemplate(templateRes.template?.optionals), ...prev }))
      }
    }).catch(() => {})
  }, [user?.token])

  const selectedStudent = students.find((s) => String(s.id) === String(selectedStudentId))

  const registerGenerated = () => {
    const token = user?.token
    if (!token) return
    fetch(`${window.location.origin}/api/contratos-generated`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ student_id: selectedStudent?.id || null }),
    }).catch(() => {})
  }

  const handleGenerate = () => {
    const body = template?.body ?? FALLBACK_BODY
    const text = buildContractText(body, studio, selectedStudent || {}, options)
    registerGenerated()
    const doc = new jsPDF({ format: 'a4', unit: 'mm' })
    const pageW = doc.internal.pageSize.getWidth()
    const margin = 20
    const lineHeight = 6
    const lines = doc.splitTextToSize(text, pageW - margin * 2)
    let y = 20
    for (const line of lines) {
      if (y > 270) {
        doc.addPage()
        y = 20
      }
      doc.setFontSize(10)
      doc.text(line, margin, y)
      y += lineHeight
    }
    const blob = doc.output('blob')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contrato-${selectedStudent?.nome || 'aluno'}.pdf`.replace(/\s+/g, '-')
    a.click()
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    const body = template?.body ?? FALLBACK_BODY
    const text = buildContractText(body, studio, selectedStudent || {}, options)
    registerGenerated()
    const doc = new jsPDF({ format: 'a4', unit: 'mm' })
    const pageW = doc.internal.pageSize.getWidth()
    const margin = 20
    const lineHeight = 6
    const lines = doc.splitTextToSize(text, pageW - margin * 2)
    let y = 20
    for (const line of lines) {
      if (y > 270) {
        doc.addPage()
        y = 20
      }
      doc.setFontSize(10)
      doc.text(line, margin, y)
      y += lineHeight
    }
    const blob = doc.output('blob')
    const url = URL.createObjectURL(blob)
    const w = window.open(url, '_blank')
    if (w) w.onload = () => w.print()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={styles.box}>
      <h2 style={styles.h2}>Gerar contrato</h2>
      <p style={{ fontSize: 13, color: '#9ab5ad', marginBottom: 16 }}>
        Escolha o aluno e os opcionais, depois baixe o PDF ou imprima.
      </p>

      {students.length === 0 && (
        <p style={styles.noStudents}>Cadastre pelo menos um aluno na aba Inserir aluno.</p>
      )}

      <label style={styles.label}>Aluno</label>
      <select
        style={styles.select}
        value={selectedStudentId}
        onChange={(e) => setSelectedStudentId(e.target.value)}
        disabled={students.length === 0}
      >
        <option value="">Selecione um aluno</option>
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nome}
          </option>
        ))}
      </select>

      {(Array.isArray(template?.optionals) ? template.optionals : [
        { key: 'valor', label: 'Valor (ex.: R$ 0,00)', type: 'text' },
        { key: 'incluirMulta', label: 'Incluir cláusula de multa', type: 'boolean' },
      ]).map((o) => {
        if (!o || !o.key) return null
        if (o.type === 'boolean') {
          return (
            <label key={o.key} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: 16 }}>
              <input
                type="checkbox"
                style={{ marginRight: 8 }}
                checked={!!options[o.key]}
                onChange={(e) => setOptions((p) => ({ ...p, [o.key]: e.target.checked }))}
              />
              {o.label || o.key}
            </label>
          )
        }
        return (
          <div key={o.key}>
            <label style={styles.label}>{o.label || o.key}</label>
            <input
              style={styles.input}
              value={options[o.key] ?? ''}
              onChange={(e) => setOptions((p) => ({ ...p, [o.key]: e.target.value }))}
              placeholder={o.key === 'valor' ? 'R$ 0,00' : ''}
            />
          </div>
        )
      })}

      <button type="button" style={styles.btn} onClick={handleGenerate} disabled={students.length === 0 || !selectedStudentId}>
        Baixar PDF
      </button>
      <button
        type="button"
        style={{ ...styles.btn, ...styles.btnSec }}
        onClick={handlePrint}
        disabled={students.length === 0 || !selectedStudentId}
      >
        Imprimir
      </button>
    </div>
  )
}
