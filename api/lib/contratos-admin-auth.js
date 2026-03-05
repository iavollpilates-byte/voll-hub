import { createClient } from '@supabase/supabase-js'
import { jwtVerify } from 'jose'

const jwtSecret = new TextEncoder().encode(
  process.env.CONTRATOS_JWT_SECRET || 'contratos-jwt-secret-change-in-production'
)

export async function verifyAdminContratos(req) {
  const auth = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim()
  if (!auth) return null
  try {
    const { payload } = await jwtVerify(auth, jwtSecret)
    return payload?.adminContratos ? payload : null
  } catch (_) {
    return null
  }
}

export function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) return null
  return createClient(supabaseUrl, supabaseKey)
}
