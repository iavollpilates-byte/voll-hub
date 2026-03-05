import { useState, useEffect } from 'react'

const styles = {
  box: { maxWidth: 720, marginBottom: 16 },
  h2: { fontSize: 18, fontWeight: 700, marginBottom: 16 },
  opts: {
    background: 'rgba(26, 46, 40, 0.6)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  label: { display: 'block', fontSize: 12, color: '#9ab5ad', marginBottom: 4 },
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
  preview: {
    background: 'rgba(26, 46, 40, 0.6)',
    borderRadius: 12,
    padding: 24,
    whiteSpace: 'pre-wrap',
    fontSize: 14,
    lineHeight: 1.6,
    color: '#e0e8e6',
  },
  toggle: { marginRight: 8, cursor: 'pointer' },
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

export default function VerContrato({ user }) {
  const [studio, setStudio] = useState(null)
  const [template, setTemplate] = useState(null)
  const [options, setOptions] = useState({
    valor: 'R$ 0,00',
    incluirMulta: false,
  })

  useEffect(() => {
    const token = user?.token
    if (!token) return
    Promise.all([
      fetch(`${window.location.origin}/api/contratos-studio`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      fetch(`${window.location.origin}/api/contratos-template`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
    ])
      .then(([studioRes, templateRes]) => {
        if (studioRes.studio && typeof studioRes.studio === 'object') setStudio(studioRes.studio)
        if (templateRes.template?.body != null) setTemplate(templateRes.template)
      })
      .catch(() => {})
  }, [user?.token])

  const exampleStudent = { nome: 'Nome do aluno', cpf: 'CPF', endereco: 'Endereço do aluno' }
  const previewText = template?.body
    ? buildFromTemplate(template.body, studio, exampleStudent, options)
    : buildContractText(studio, exampleStudent, options)

  return (
    <div style={styles.box}>
      <h2 style={styles.h2}>Ver por dentro do contrato</h2>
      <p style={{ fontSize: 13, color: '#9ab5ad', marginBottom: 8 }}>
        Abaixo você vê a prévia do contrato com os opcionais. Ao gerar o PDF, os dados do estúdio e do aluno serão preenchidos.
      </p>
      <p style={{ fontSize: 13, color: '#9ab5ad', marginBottom: 16 }}>
        Os opcionais podem ser alterados na hora de gerar o PDF.
      </p>

      <div style={styles.opts}>
        <h3 style={{ fontSize: 14, marginBottom: 12 }}>Opcionais</h3>
        <label style={styles.label}>Valor / preço (ex.: R$ 0,00)</label>
        <input
          style={styles.input}
          value={options.valor}
          onChange={(e) => setOptions((p) => ({ ...p, valor: e.target.value }))}
          placeholder="R$ 0,00"
        />
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginTop: 8 }}>
          <input
            type="checkbox"
            style={styles.toggle}
            checked={options.incluirMulta}
            onChange={(e) => setOptions((p) => ({ ...p, incluirMulta: e.target.checked }))}
          />
          Incluir cláusula de multa por rescisão antecipada
        </label>
        <p style={{ fontSize: 12, color: '#9ab5ad', marginTop: 8 }}>
          Se ativado, o contrato incluirá menção à possibilidade de multa em caso de rescisão antecipada pelo aluno.
        </p>
      </div>

      <h3 style={{ fontSize: 14, marginBottom: 8 }}>Prévia do contrato</h3>
      <div style={styles.preview}>{previewText}</div>
    </div>
  )
}
