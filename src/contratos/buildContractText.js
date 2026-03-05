/**
 * Constrói o texto final do contrato a partir do body do template.
 * Suporta: {{#KEY}}...{{/KEY}} (blocos opcionais), {{PLACEHOLDER}}, [ CAMPO ] (colchetes).
 */

function applyOptionalBlocks(body, options) {
  let out = body || ''
  const re = /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g
  out = out.replace(re, (_, key, content) => {
    const include = options && (options[key] === true || options[key] === 'true' || (typeof options[key] === 'string' && options[key].trim() !== ''))
    return include ? content : ''
  })
  return out
}

const CURLY_PLACEHOLDERS = {
  RAZAO_SOCIAL: (s) => s?.razao_social || s?.nome_fantasia || '[Razão social / Nome fantasia]',
  ENDERECO: (s) => s?.endereco || '[Endereço do estúdio]',
  CNPJ: (s) => s?.cnpj || '[CNPJ]',
  TELEFONE: (s) => s?.telefone || '[Telefone]',
  ALUNO_NOME: (_, st) => st?.nome || '[Nome do aluno]',
  ALUNO_CPF: (_, st) => st?.cpf || '[CPF do aluno]',
  ALUNO_ENDERECO: (_, st) => st?.endereco || '[Endereço do aluno]',
}

/** Normaliza texto entre colchetes para lookup (trim, uppercase, colapsa espaços) */
function norm(s) {
  return (s || '').trim().toUpperCase().replace(/\s+/g, ' ')
}

/** Mapa: texto normalizado entre [ ] -> (studio, student, options) => value */
const BRACKET_SOURCES = [
  ['RAZÃO SOCIAL / NOME', (s) => s?.razao_social || s?.nome_fantasia || ''],
  ['NOME DO STUDIO', (s) => s?.razao_social || s?.nome_fantasia || ''],
  ['CNPJ / CPF', (s) => s?.cnpj || ''],
  ['ENDEREÇO COMPLETO', (s) => s?.endereco || ''],
  ['ENDEREÇO DO ALUNO', (_, st) => st?.endereco || ''],
  ['ENDEREÇO ALUNO', (_, st) => st?.endereco || ''],
  ['CIDADE / ESTADO', (s) => [s?.cidade, s?.estado].filter(Boolean).join(' / ') || ''],
  ['CIDADE ESTADO ALUNO', (_, st) => [st?.cidade, st?.estado].filter(Boolean).join(' / ') || ''],
  ['CIDADE ESTÚDIO', (s) => [s?.cidade, s?.estado].filter(Boolean).join(' / ') || ''],
  ['CIDADE ALUNO', (_, st) => [st?.cidade, st?.estado].filter(Boolean).join(' / ') || ''],
  ['TELEFONE', (s) => s?.telefone || ''],
  ['E-MAIL ESTÚDIO', (s) => s?.email || ''],
  ['E-MAIL ALUNO', (_, st) => st?.email || ''],
  ['E-MAIL', (s) => s?.email || ''],
  ['RESPONSÁVEL TÉCNICO', (s) => s?.responsavel_tecnico || ''],
  ['CREF OU CREFITO SE APLICÁVEL', (s) => s?.registro_profissional || ''],
  ['REGISTRO PROFISSIONAL', (s) => s?.registro_profissional || ''],
  ['NOME COMPLETO DO ALUNO', (_, st) => st?.nome || ''],
  ['CPF DO ALUNO', (_, st) => st?.cpf || ''],
  ['RG DO ALUNO', (_, st) => st?.rg || ''],
  ['DATA DE NASCIMENTO', (_, st) => st?.data_nascimento || ''],
  ['VALOR DA MENSALIDADE', (_, __, opt) => opt?.valor ?? ''],
  ['VALOR', (_, __, opt) => opt?.valor ?? ''],
  ['FREQUÊNCIA SEMANAL - EX: 2 AULAS POR SEMANA', (_, __, opt) => opt?.frequencia_semanal ?? ''],
  ['DURAÇÃO EM MINUTOS', (_, __, opt) => opt?.duracao_aula ?? ''],
  ['TIPO DE TURMA - INDIVIDUAL / DUPLA / TRIO / GRUPO', (_, __, opt) => opt?.tipo_turma ?? ''],
  ['DIAS E HORÁRIOS', (_, __, opt) => opt?.horario_fixo ?? ''],
  ['DIA DE VENCIMENTO', (_, __, opt) => opt?.dia_vencimento ?? ''],
  ['FORMA DE PAGAMENTO', (_, __, opt) => opt?.forma_pagamento ?? ''],
  ['PIX / CARTÃO / BOLETO / OUTRO', (_, __, opt) => opt?.forma_pagamento ?? ''],
  ['DATA DE INÍCIO', (_, __, opt) => opt?.data_inicio ?? ''],
  ['NÚMERO DE MESES OU PRAZO INDETERMINADO', (_, __, opt) => opt?.vigencia_contrato ?? ''],
  ['VIGÊNCIA DO CONTRATO', (_, __, opt) => opt?.vigencia_contrato ?? ''],
  ['ÍNDICE DE REAJUSTE - EX: IPCA / IGP-M', (_, __, opt) => opt?.indice_reajuste ?? ''],
  ['PRAZO DE AVISO - EX: 30 DIAS', (_, __, opt) => opt?.prazo_aviso ?? ''],
  ['PRAZO DE REMARCAÇÃO - EX: 24 HORAS', (_, __, opt) => opt?.prazo_remarcacao ?? ''],
  ['NÚMERO DE REMARCAÇÕES - EX: 2 POR MÊS', (_, __, opt) => opt?.numero_remarcacoes ?? ''],
  ['PRAZO DE CANCELAMENTO - EX: 30 DIAS', (_, __, opt) => opt?.prazo_cancelamento ?? ''],
  ['PRAZO DE INADIMPLÊNCIA - EX: 30 DIAS', (_, __, opt) => opt?.prazo_inadimplencia ?? ''],
  ['PERCENTUAL DE MULTA - EX: 2%', (_, __, opt) => opt?.percentual_multa ?? ''],
  ['JUROS MENSAIS - EX: 1% AO MÊS', (_, __, opt) => opt?.juros_mensais ?? ''],
  ['ÍNDICE - EX: IPCA', (_, __, opt) => opt?.indice_correcao ?? ''],
  ['PRAZO DE REEMBOLSO - EX: 15 DIAS ÚTEIS', (_, __, opt) => opt?.prazo_reembolso ?? ''],
  ['CONDIÇÕES DE SAÚDE / RESTRIÇÕES', (_, __, opt) => opt?.condicoes_saude ?? ''],
  ['MEDICAMENTOS EM USO', (_, __, opt) => opt?.medicamentos ?? ''],
  ['EMAIL DO STUDIO', (s) => s?.email || ''],
  ['NOME DO RESPONSÁVEL', (s) => s?.responsavel_tecnico || s?.razao_social || ''],
  ['NOME DO ALUNO', (_, st) => st?.nome || ''],
  ['NOME', (_, st) => st?.nome || ''],
  ['CPF', (_, st) => st?.cpf || ''],
  ['ESPECIFICAR MODALIDADE', (_, __, opt) => opt?.modalidade_outro ?? ''],
]

const bracketMap = new Map(BRACKET_SOURCES.map(([k, fn]) => [norm(k), fn]))

function getBracketValue(bracketContent, studio, student, options) {
  const n = norm(bracketContent)
  const fn = bracketMap.get(n)
  if (fn) return fn(studio, student, options)
  return null
}

function applyCurlyPlaceholders(body, studio, student, options) {
  const data = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const [dia, mes, ano] = data.split('/')
  let out = body || ''
  Object.entries(CURLY_PLACEHOLDERS).forEach(([key, fn]) => {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), fn(studio, student))
  })
  out = out.replace(/\{\{VALOR\}\}/g, options?.valor ?? 'R$ 0,00')
  out = out.replace(/\{\{DATA\}\}/g, data)
  out = out.replace(/\{\{DIA\}\}/g, dia)
  out = out.replace(/\{\{MÊS\}\}/g, mes)
  out = out.replace(/\{\{MES\}\}/g, mes)
  out = out.replace(/\{\{ANO\}\}/g, ano)
  const multaSimNao = options?.incluirMulta ? 'Sim' : 'Não'
  const multaTexto = options?.incluirMulta
    ? 'Em caso de rescisão antecipada pelo aluno, será aplicada multa conforme combinado entre as partes.'
    : 'Não há cláusula de multa por rescisão antecipada.'
  out = out.replace(/\{\{MULTA_SIM_NAO\}\}/g, multaSimNao)
  out = out.replace(/\{\{MULTA_TEXTO\}\}/g, multaTexto)
  return out
}

function applyBracketPlaceholders(body, studio, student, options) {
  let out = body || ''
  out = out.replace(/\s*\[\s*([^\]]+?)\s*\]\s*/g, (_, content) => {
    const val = getBracketValue(content, studio, student, options)
    return val !== null && val !== undefined ? String(val) : `[ ${content.trim()} ]`
  })
  return out
}

/**
 * Gera o texto final do contrato.
 * @param {string} body - Texto do modelo (pode ter {{#KEY}}...{{/KEY}}, {{X}}, [ Y ])
 * @param {object} studio - Dados do estúdio
 * @param {object} student - Dados do aluno
 * @param {object} options - Opcionais (valor, incluirMulta, e quaisquer keys do template optionals)
 */
export function buildContractText(body, studio, student, options) {
  let out = body || ''
  out = applyOptionalBlocks(out, options)
  out = applyCurlyPlaceholders(out, studio, student, options)
  out = applyBracketPlaceholders(out, studio, student, options)
  return out
}
