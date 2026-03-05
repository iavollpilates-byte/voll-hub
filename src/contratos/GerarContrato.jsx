import { useState, useEffect } from 'react'
import { jsPDF } from 'jspdf'

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

const PLACEHOLDERS = {
  RAZAO_SOCIAL: (s) => s?.razao_social || s?.nome_fantasia || '[Razão social / Nome fantasia]',
  ENDERECO: (s) => s?.endereco || '[Endereço do estúdio]',
  CNPJ: (s) => s?.cnpj || '[CNPJ]',
  TELEFONE: (s) => s?.telefone || '[Telefone]',
  ALUNO_NOME: (_, st) => st?.nome || '[Nome do aluno]',
  ALUNO_CPF: (_, st) => st?.cpf || '[CPF do aluno]',
  ALUNO_ENDERECO: (_, st) => st?.endereco || '[Endereço do aluno]',
}

function buildFromTemplate(body, studio, student, options) {
  const data = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const valor = options?.valor ?? 'R$ 0,00'
  const multaSimNao = options?.incluirMulta ? 'Sim' : 'Não'
  const multaTexto = options?.incluirMulta
    ? 'Em caso de rescisão antecipada pelo aluno, será aplicada multa conforme combinado entre as partes.'
    : 'Não há cláusula de multa por rescisão antecipada.'
  let out = body || ''
  Object.entries(PLACEHOLDERS).forEach(([key, fn]) => {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), fn(studio, student))
  })
  out = out.replace(/\{\{VALOR\}\}/g, valor)
  out = out.replace(/\{\{DATA\}\}/g, data)
  out = out.replace(/\{\{MULTA_SIM_NAO\}\}/g, multaSimNao)
  out = out.replace(/\{\{MULTA_TEXTO\}\}/g, multaTexto)
  return out
}

function buildContractText(studio, student, options) {
  const rs = studio?.razao_social || studio?.nome_fantasia || '[Razão social / Nome fantasia]'
  const end = studio?.endereco || '[Endereço do estúdio]'
  const cnpj = studio?.cnpj || '[CNPJ]'
  const tel = studio?.telefone || '[Telefone]'
  const aluno = student?.nome || '[Nome do aluno]'
  const alunoCpf = student?.cpf || '[CPF do aluno]'
  const alunoEnd = student?.endereco || '[Endereço do aluno]'
  const valor = options?.valor ?? 'R$ 0,00'
  const multa = options?.incluirMulta ? 'Sim' : 'Não'
  const data = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE PILATES

CONTRATANTE (estúdio):
${rs}
Endereço: ${end}
CNPJ: ${cnpj}
Telefone: ${tel}

CONTRATADO (aluno):
${aluno}
CPF: ${alunoCpf}
Endereço: ${alunoEnd}

OBJETIVO: Prestação de serviços de método Pilates, conforme planejamento e regras do estúdio.

VALOR MENSAL: ${valor}

VIGÊNCIA: O presente contrato tem vigência a partir de ${data}, podendo ser rescindido pelas partes conforme cláusulas abaixo.

CLÁUSULA DE MULTA (RESCISÃO ANTECIPADA): ${multa}
${options?.incluirMulta ? 'Em caso de rescisão antecipada pelo aluno, será aplicada multa conforme combinado entre as partes.' : 'Não há cláusula de multa por rescisão antecipada.'}

Demais condições serão informadas pelo estúdio. Este documento serve como acordo entre as partes.

Data: ${data}
_________________________ (Estúdio)     _________________________ (Aluno)`
}

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
      if (templateRes.template?.body != null) setTemplate(templateRes.template)
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
    const text = template?.body
      ? buildFromTemplate(template.body, studio, selectedStudent || {}, options)
      : buildContractText(studio, selectedStudent || {}, options)
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
    const text = template?.body
      ? buildFromTemplate(template.body, studio, selectedStudent || {}, options)
      : buildContractText(studio, selectedStudent || {}, options)
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

      <label style={styles.label}>Valor (ex.: R$ 0,00)</label>
      <input
        style={styles.input}
        value={options.valor}
        onChange={(e) => setOptions((p) => ({ ...p, valor: e.target.value }))}
        placeholder="R$ 0,00"
      />
      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: 16 }}>
        <input
          type="checkbox"
          style={{ marginRight: 8 }}
          checked={options.incluirMulta}
          onChange={(e) => setOptions((p) => ({ ...p, incluirMulta: e.target.checked }))}
        />
        Incluir cláusula de multa
      </label>

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
