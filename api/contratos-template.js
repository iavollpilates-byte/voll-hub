import { createClient } from '@supabase/supabase-js'
import { jwtVerify } from 'jose'
import { verifyAdminContratos } from './lib/contratos-admin-auth.js'

const jwtSecret = new TextEncoder().encode(
  process.env.CONTRATOS_JWT_SECRET || 'contratos-jwt-secret-change-in-production'
)

async function verifyUserOrAdmin(req) {
  const admin = await verifyAdminContratos(req)
  if (admin) return true
  const auth = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim()
  if (!auth) return false
  try {
    const { payload } = await jwtVerify(auth, jwtSecret)
    return !!(payload?.userId || payload?.adminContratos)
  } catch (_) {
    return false
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const ok = await verifyUserOrAdmin(req)
  if (!ok) return res.status(401).json({ error: 'Não autorizado.' })

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: 'Serviço não configurado.' })
  const supabase = createClient(supabaseUrl, supabaseKey)
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
