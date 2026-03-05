import { createClient } from '@supabase/supabase-js'
import { SignJWT } from 'jose'

const jwtSecret = new TextEncoder().encode(
  process.env.CONTRATOS_JWT_SECRET || 'contratos-jwt-secret-change-in-production'
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { pin } = req.body || {}
  const pinStr = (pin || '').toString().trim()

  const envPin = process.env.ADMIN_PIN_CONTRATOS
  if (envPin && pinStr === envPin) {
    const token = await new SignJWT({ adminContratos: true, role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(jwtSecret)
    return res.status(200).json({ token, admin: true })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return res.status(401).json({ error: 'PIN incorreto.' })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data } = await supabase
    .from('contratos_admin')
    .select('id')
    .eq('pin', pinStr)
    .limit(1)
    .maybeSingle()

  if (data) {
    const token = await new SignJWT({ adminContratos: true, role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(jwtSecret)
    return res.status(200).json({ token, admin: true })
  }

  return res.status(401).json({ error: 'PIN incorreto.' })
}
