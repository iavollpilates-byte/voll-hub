import bcrypt from 'bcryptjs'
import { verifyAdminContratos, getSupabaseAdmin } from './lib/contratos-admin-auth.js'

export default async function handler(req, res) {
  const payload = await verifyAdminContratos(req)
  if (!payload) return res.status(401).json({ error: 'Não autorizado.' })

  const supabase = getSupabaseAdmin()
  if (!supabase) return res.status(500).json({ error: 'Serviço não configurado.' })

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('contratos_users')
      .select('id, name, email, cpf, whatsapp, created_at')
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ users: data || [] })
  }

  if (req.method === 'POST') {
    const body = req.body || {}
    const name = (body.name || '').toString().trim()
    const email = (body.email || '').toString().trim().toLowerCase()
    const password = (body.password || '').toString()
    const cpf = (body.cpf || '').toString().trim()
    const whatsapp = (body.whatsapp || '').toString().trim()
    if (!name || !email) return res.status(400).json({ error: 'Nome e email são obrigatórios.' })
    if (!password || password.length < 6) return res.status(400).json({ error: 'Senha com pelo menos 6 caracteres.' })
    const { data: existing } = await supabase.from('contratos_users').select('id').eq('email', email).limit(1)
    if (existing?.length) return res.status(400).json({ error: 'Este email já está cadastrado.' })
    const password_hash = await bcrypt.hash(password, 10)
    const { data, error } = await supabase
      .from('contratos_users')
      .insert({ name, email, cpf, whatsapp, password_hash })
      .select('id, name, email, cpf, whatsapp, created_at')
      .single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ user: data })
  }

  if (req.method === 'PUT') {
    const body = req.body || {}
    const id = body.id
    if (id == null) return res.status(400).json({ error: 'id do usuário é obrigatório.' })
    const name = (body.name || '').toString().trim()
    const email = (body.email || '').toString().trim().toLowerCase()
    const cpf = (body.cpf || '').toString().trim()
    const whatsapp = (body.whatsapp || '').toString().trim()
    if (!name || !email) return res.status(400).json({ error: 'Nome e email são obrigatórios.' })
    const updates = { name, email, cpf, whatsapp }
    if (body.password && body.password.toString().length >= 6) {
      updates.password_hash = await bcrypt.hash(body.password.toString(), 10)
    }
    const { data: existing } = await supabase.from('contratos_users').select('id').eq('id', id).limit(1).maybeSingle()
    if (!existing) return res.status(404).json({ error: 'Usuário não encontrado.' })
    const { data: other } = await supabase.from('contratos_users').select('id').eq('email', email).neq('id', id).limit(1)
    if (other?.length) return res.status(400).json({ error: 'Este email já está em uso por outro usuário.' })
    const { data, error } = await supabase
      .from('contratos_users')
      .update(updates)
      .eq('id', id)
      .select('id, name, email, cpf, whatsapp, created_at')
      .single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ user: data })
  }

  if (req.method === 'DELETE') {
    const id = req.query.id ?? req.body?.id
    if (id == null) return res.status(400).json({ error: 'id do usuário é obrigatório.' })
    const { error } = await supabase.from('contratos_users').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
