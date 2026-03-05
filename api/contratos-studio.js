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
      .from('contratos_studios')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ studio: data || null })
  }

  if (req.method === 'POST') {
    const body = req.body || {}
    const studio = {
      user_id: userId,
      razao_social: (body.razao_social || '').toString().trim(),
      nome_fantasia: (body.nome_fantasia || '').toString().trim(),
      endereco: (body.endereco || '').toString().trim(),
      cnpj: (body.cnpj || '').toString().trim(),
      telefone: (body.telefone || '').toString().trim(),
      email: (body.email || '').toString().trim(),
      cidade: (body.cidade || '').toString().trim(),
      estado: (body.estado || '').toString().trim(),
      responsavel_tecnico: (body.responsavel_tecnico || '').toString().trim(),
      registro_profissional: (body.registro_profissional || '').toString().trim(),
      updated_at: new Date().toISOString(),
    }
    const { data: existing } = await supabase
      .from('contratos_studios')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()
    let result
    if (existing) {
      result = await supabase
        .from('contratos_studios')
        .update(studio)
        .eq('user_id', userId)
        .select()
        .single()
    } else {
      result = await supabase.from('contratos_studios').insert(studio).select().single()
    }
    if (result.error) return res.status(500).json({ error: result.error.message })
    return res.status(200).json({ studio: result.data })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
