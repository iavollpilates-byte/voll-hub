import { createClient } from '@supabase/supabase-js'
import { jwtVerify } from 'jose'

const jwtSecret = new TextEncoder().encode(
  process.env.CONTRATOS_JWT_SECRET || 'contratos-jwt-secret-change-in-production'
)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim()
  if (!auth) return res.status(401).json({ error: 'Não autorizado.' })
  let payload
  try {
    const { payload: p } = await jwtVerify(auth, jwtSecret)
    payload = p
  } catch (_) {
    return res.status(401).json({ error: 'Não autorizado.' })
  }
  if (!payload.adminContratos) {
    return res.status(403).json({ error: 'Acesso negado.' })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Serviço não configurado.' })
  }
  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data, error } = await supabase
    .from('contratos_users')
    .select('id, name, email, cpf, whatsapp, created_at')
    .order('created_at', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ users: data || [] })
}
