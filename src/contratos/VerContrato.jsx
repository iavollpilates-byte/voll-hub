import { useState, useEffect } from 'react'
import { buildContractText } from './buildContractText.js'

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

function defaultOptionsFromTemplate(optionals) {
  if (!Array.isArray(optionals)) return { valor: 'R$ 0,00', incluirMulta: false }
  const opts = {}
  optionals.forEach((o) => {
    if (o && o.key) {
      opts[o.key] = o.type === 'boolean' ? false : (o.type === 'number' ? '' : '')
      if (o.key === 'valor' && opts[o.key] === '') opts[o.key] = 'R$ 0,00'
    }
  })
  if (Object.keys(opts).length === 0) return { valor: 'R$ 0,00', incluirMulta: false }
  return opts
}

const FALLBACK_BODY = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE PILATES

CONTRATANTE (estúdio):
{{RAZAO_SOCIAL}}
Endereço: {{ENDERECO}}
CNPJ: {{CNPJ}}
Telefone: {{TELEFONE}}

CONTRATADO (aluno):
{{ALUNO_NOME}}
CPF: {{ALUNO_CPF}}
Endereço: {{ALUNO_ENDERECO}}

VALOR MENSAL: {{VALOR}}
Data: {{DATA}}`

export default function VerContrato({ user }) {
  const [studio, setStudio] = useState(null)
  const [template, setTemplate] = useState(null)
  const [options, setOptions] = useState({ valor: 'R$ 0,00', incluirMulta: false })

  useEffect(() => {
    if (template?.optionals) setOptions(defaultOptionsFromTemplate(template.optionals))
  }, [template?.optionals])

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

  const exampleStudent = {
    nome: 'Nome do aluno',
    cpf: 'CPF',
    endereco: 'Endereço do aluno',
    email: 'aluno@email.com',
    cidade: 'Cidade',
    estado: 'UF',
  }
  const body = template?.body ?? FALLBACK_BODY
  const previewText = buildContractText(body, studio, exampleStudent, options)
  const optionalsList = Array.isArray(template?.optionals) ? template.optionals : [
    { key: 'valor', label: 'Valor (ex.: R$ 0,00)', type: 'text' },
    { key: 'incluirMulta', label: 'Incluir cláusula de multa por rescisão antecipada', type: 'boolean' },
  ]

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
        {optionalsList.map((o) => {
          if (!o || !o.key) return null
          if (o.type === 'boolean') {
            return (
              <label key={o.key} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: 12 }}>
                <input
                  type="checkbox"
                  style={styles.toggle}
                  checked={!!options[o.key]}
                  onChange={(e) => setOptions((p) => ({ ...p, [o.key]: e.target.checked }))}
                />
                {o.label || o.key}
              </label>
            )
          }
          return (
            <div key={o.key} style={{ marginBottom: 12 }}>
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
      </div>

      <h3 style={{ fontSize: 14, marginBottom: 8 }}>Prévia do contrato</h3>
      <div style={styles.preview}>{previewText}</div>
    </div>
  )
}
