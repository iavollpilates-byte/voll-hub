import { createClient } from '@supabase/supabase-js'
import { verifyContratosToken } from './contratos-auth.js'

export default async function handler(req, res) {
  const payload = await verifyContratosToken(req.headers.authorization)
  if (!payload || !payload.userId) {
    return res.status(401).json({ error: 'Não autorizado.' })
  }
  const userId = payload.userId

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Serviço não configurado.' })
  }
  const supabase = createClient(supabaseUrl, supabaseKey)

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('contratos_students')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ students: data || [] })
  }

  if (req.method === 'POST') {
    const body = req.body || {}
    if (!(body.nome || '').toString().trim()) {
      return res.status(400).json({ error: 'Nome é obrigatório.' })
    }
    const row = {
      user_id: userId,
      nome: (body.nome || '').toString().trim(),
      cpf: (body.cpf || '').toString().trim(),
      rg: (body.rg || '').toString().trim(),
      data_nascimento: (body.data_nascimento || '').toString().trim(),
      email: (body.email || '').toString().trim(),
      telefone: (body.telefone || '').toString().trim(),
      endereco: (body.endereco || '').toString().trim(),
      cidade: (body.cidade || '').toString().trim(),
      estado: (body.estado || '').toString().trim(),
    }
    const { data, error } = await supabase.from('contratos_students').insert(row).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ student: data })
  }

  if (req.method === 'PUT') {
    const body = req.body || {}
    const id = body.id
    if (id == null) return res.status(400).json({ error: 'id do aluno é obrigatório.' })
    const { data: existing } = await supabase
      .from('contratos_students')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()
    if (!existing) return res.status(404).json({ error: 'Aluno não encontrado.' })
    const updates = {
      nome: (body.nome || '').toString().trim(),
      cpf: (body.cpf || '').toString().trim(),
      rg: (body.rg || '').toString().trim(),
      data_nascimento: (body.data_nascimento || '').toString().trim(),
      email: (body.email || '').toString().trim(),
      telefone: (body.telefone || '').toString().trim(),
      endereco: (body.endereco || '').toString().trim(),
      cidade: (body.cidade || '').toString().trim(),
      estado: (body.estado || '').toString().trim(),
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase
      .from('contratos_students')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ student: data })
  }

  if (req.method === 'DELETE') {
    const body = req.body || {}
    const id = body.id
    if (id == null) return res.status(400).json({ error: 'id do aluno é obrigatório.' })
    const { error } = await supabase
      .from('contratos_students')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
