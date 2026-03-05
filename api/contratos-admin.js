import bcrypt from 'bcryptjs'
import { verifyAdminContratos, getSupabaseAdmin } from './lib/contratos-admin-auth.js'

export default async function handler(req, res) {
  const payload = await verifyAdminContratos(req)
  if (!payload) return res.status(401).json({ error: 'Não autorizado.' })

  const supabase = getSupabaseAdmin()
  if (!supabase) return res.status(500).json({ error: 'Serviço não configurado.' })

  const list = req.query.list || (req.method === 'GET' ? 'users' : null)

  if (req.method === 'GET') {
    if (list === 'studios') {
      const { data: studios, error } = await supabase
        .from('contratos_studios')
        .select(`
          id, user_id, razao_social, nome_fantasia, endereco, cnpj, telefone, created_at, updated_at,
          contratos_users!inner(name, email)
        `)
        .order('created_at', { ascending: false })
      if (error) return res.status(500).json({ error: error.message })
      const result = (studios || []).map((s) => {
        const { contratos_users, ...rest } = s
        return { ...rest, user_name: contratos_users?.name, user_email: contratos_users?.email }
      })
      return res.status(200).json({ studios: result })
    }
    if (list === 'contracts') {
      const { data, error } = await supabase
        .from('contratos_generated')
        .select(`
          id, user_id, student_id, file_path, created_at,
          contratos_users(name, email),
          contratos_students(nome)
        `)
        .order('created_at', { ascending: false })
      if (error) return res.status(500).json({ error: error.message })
      const result = (data || []).map((r) => ({
        id: r.id,
        user_id: r.user_id,
        student_id: r.student_id,
        file_path: r.file_path,
        created_at: r.created_at,
        user_name: r.contratos_users?.name,
        user_email: r.contratos_users?.email,
        student_name: r.contratos_students?.nome ?? (Array.isArray(r.contratos_students) ? r.contratos_students[0]?.nome : null),
      }))
      return res.status(200).json({ contracts: result })
    }
    if (list === 'template') {
      const { data, error } = await supabase
        .from('contratos_template')
        .select('id, body, optionals, updated_at')
        .limit(1)
        .maybeSingle()
      if (error) return res.status(500).json({ error: error.message })
      if (!data) return res.status(200).json({ template: { body: '', optionals: [] } })
      return res.status(200).json({
        template: { id: data.id, body: data.body || '', optionals: data.optionals || [], updated_at: data.updated_at },
      })
    }
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
    if (body.body !== undefined) {
      const templateBody = typeof body.body === 'string' ? body.body : ''
      const optionals = Array.isArray(body.optionals) ? body.optionals : []
      const { data: existing } = await supabase.from('contratos_template').select('id').limit(1).maybeSingle()
      const row = { body: templateBody, optionals, updated_at: new Date().toISOString() }
      const result = existing
        ? await supabase.from('contratos_template').update(row).eq('id', existing.id).select().single()
        : await supabase.from('contratos_template').insert(row).select().single()
      if (result.error) return res.status(500).json({ error: result.error.message })
      return res.status(200).json({ template: { id: result.data.id, body: result.data.body, optionals: result.data.optionals, updated_at: result.data.updated_at } })
    }
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
