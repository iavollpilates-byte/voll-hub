import { supabase } from '../supabaseClient'

const STORAGE_KEY = 'estudante_token'
const ESTUDANTE_KEY = 'estudante_user'

export function getStoredToken() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function setStoredSession(token, estudante) {
  try {
    localStorage.setItem(STORAGE_KEY, token)
    if (estudante) localStorage.setItem(ESTUDANTE_KEY, JSON.stringify(estudante))
  } catch (_) {}
}

export function getStoredEstudante() {
  try {
    const s = localStorage.getItem(ESTUDANTE_KEY)
    return s ? JSON.parse(s) : null
  } catch {
    return null
  }
}

export function clearStoredSession() {
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(ESTUDANTE_KEY)
  } catch (_) {}
}

export async function validateToken(token) {
  const { data: row, error } = await supabase
    .from('estudante_tokens')
    .select('estudante_id, expires_at')
    .eq('token', token)
    .single()
  if (error || !row) return null
  if (new Date(row.expires_at) < new Date()) return null
  const { data: estudante } = await supabase.from('estudantes').select('*').eq('id', row.estudante_id).single()
  return estudante || null
}

export async function createEstudante({ name, email, phone }) {
  const { data: existing } = await supabase.from('estudantes').select('id').eq('email', email.trim().toLowerCase()).maybeSingle()
  if (existing) return { error: 'Este e-mail já está cadastrado. Use "Enviar link de acesso" para entrar.' }
  const { data: estudante, error: errInsert } = await supabase
    .from('estudantes')
    .insert({ name: name.trim(), email: email.trim().toLowerCase(), phone: (phone || '').trim() })
    .select()
    .single()
  if (errInsert) return { error: errInsert.message || 'Erro ao cadastrar.' }
  const token = crypto.randomUUID ? crypto.randomUUID() : `t_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)
  const { error: errToken } = await supabase.from('estudante_tokens').insert({
    estudante_id: estudante.id,
    token,
    expires_at: expiresAt.toISOString(),
  })
  if (errToken) return { error: 'Cadastro ok, mas falha ao gerar acesso. Tente "Enviar link de acesso".' }
  return { estudante, token }
}

export async function requestMagicLink(email) {
  const { data: estudante } = await supabase.from('estudantes').select('id, name, email').eq('email', email.trim().toLowerCase()).single()
  if (!estudante) return { error: 'E-mail não encontrado. Faça seu cadastro primeiro.' }
  const token = crypto.randomUUID ? crypto.randomUUID() : `t_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)
  await supabase.from('estudante_tokens').insert({
    estudante_id: estudante.id,
    token,
    expires_at: expiresAt.toISOString(),
  })
  const link = `${typeof window !== 'undefined' ? window.location.origin : 'https://rafael.grupovoll.com.br'}/estudante?token=${token}`
  return { ok: true, message: 'Link gerado. Use o botão abaixo para acessar (e-mail em breve).', token, link, estudante }
}

/** Chama a API serverless para gerar o magic link (e opcionalmente enviar por e-mail). Em caso de falha, faz fallback para requestMagicLink. */
export async function requestMagicLinkWithEmail(email) {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  try {
    const r = await fetch(`${base}/api/support`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'estudanteMagicLink', email: email.trim().toLowerCase() }),
    })
    const data = await r.json().catch(() => ({}))
    if (r.ok && data.ok && data.link) {
      return {
        ok: true,
        link: data.link,
        message: data.message || (data.emailSent ? 'Link enviado para seu e-mail.' : 'Link gerado. Use o botão abaixo para acessar.'),
        emailSent: data.emailSent,
      }
    }
    if (r.status === 404 && data.error) return { error: data.error }
    if (data.error) return { error: data.error }
  } catch (_) {}
  return requestMagicLink(email)
}

export async function getEstudanteById(id) {
  const { data } = await supabase.from('estudantes').select('*').eq('id', id).single()
  return data
}

export async function listDocuments() {
  const { data } = await supabase
    .from('estudante_documents')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
  return data || []
}

export async function listEstudanteLinks() {
  const { data } = await supabase
    .from('estudante_links')
    .select('id, title, description, url, sort_order')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
  return data || []
}

export async function listDiagnosticoQuestions() {
  const { data } = await supabase
    .from('diagnostico_questions')
    .select('*')
    .order('question_number', { ascending: true })
  return data || []
}

export async function saveDiagnosticoResult(estudanteId, payload) {
  const { data, error } = await supabase
    .from('diagnostico_results')
    .insert({
      estudante_id: estudanteId,
      responses: payload.responses,
      total_score: payload.totalScore,
      level: payload.level,
      dimension_scores: payload.dimensionScores,
      recommendations: payload.recommendations,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function listDiagnosticoResults(estudanteId) {
  const { data } = await supabase
    .from('diagnostico_results')
    .select('*')
    .eq('estudante_id', estudanteId)
    .order('created_at', { ascending: false })
  return data || []
}

export async function getConfig(keys) {
  const { data } = await supabase.from('config').select('key, value').in('key', keys)
  const out = {}
  ;(data || []).forEach((r) => { out[r.key] = r.value })
  return out
}
