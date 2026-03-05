import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const jwtSecret = new TextEncoder().encode(
  process.env.CONTRATOS_JWT_SECRET || 'contratos-jwt-secret-change-in-production'
)

async function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.')
  }
  return createClient(supabaseUrl, supabaseKey)
}

export async function verifyContratosToken(authorization) {
  const token = authorization?.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, jwtSecret)
    return payload
  } catch (_) {
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { action, name, email, cpf, whatsapp, password } = req.body || {}
  const emailNorm = (email || '').toString().trim().toLowerCase()

  if (action === 'register') {
    if (!name || !emailNorm || !password) {
      return res.status(400).json({ error: 'Preencha nome, email e senha.' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Senha com pelo menos 6 caracteres.' })
    }
    try {
      const supabase = await getSupabase()
      const { data: existing } = await supabase
        .from('contratos_users')
        .select('id')
        .eq('email', emailNorm)
        .limit(1)
      if (existing && existing.length > 0) {
        return res.status(400).json({ error: 'Este email já está cadastrado.' })
      }
      const password_hash = await bcrypt.hash(password, 10)
      const { data: inserted, error } = await supabase
        .from('contratos_users')
        .insert({
          name: (name || '').toString().trim(),
          email: emailNorm,
          cpf: (cpf || '').toString().trim(),
          whatsapp: (whatsapp || '').toString().trim(),
          password_hash,
        })
        .select('id, name, email, cpf, whatsapp, created_at')
        .single()
      if (error) {
        return res.status(500).json({ error: error.message })
      }
      const token = await new SignJWT({
        userId: inserted.id,
        email: inserted.email,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('30d')
        .sign(jwtSecret)
      return res.status(200).json({
        user: {
          id: inserted.id,
          name: inserted.name,
          email: inserted.email,
          cpf: inserted.cpf,
          whatsapp: inserted.whatsapp,
        },
        token,
      })
    } catch (e) {
      return res.status(500).json({ error: e.message || 'Erro ao cadastrar.' })
    }
  }

  if (action === 'login') {
    if (!emailNorm || !password) {
      return res.status(400).json({ error: 'Preencha email e senha.' })
    }
    try {
      const supabase = await getSupabase()
      const { data: user, error } = await supabase
        .from('contratos_users')
        .select('id, name, email, cpf, whatsapp, password_hash')
        .eq('email', emailNorm)
        .limit(1)
        .single()
      if (error || !user) {
        return res.status(401).json({ error: 'Email ou senha incorretos.' })
      }
      const ok = await bcrypt.compare(password, user.password_hash)
      if (!ok) {
        return res.status(401).json({ error: 'Email ou senha incorretos.' })
      }
      const token = await new SignJWT({
        userId: user.id,
        email: user.email,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('30d')
        .sign(jwtSecret)
      return res.status(200).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          cpf: user.cpf,
          whatsapp: user.whatsapp,
        },
        token,
      })
    } catch (e) {
      return res.status(500).json({ error: e.message || 'Erro ao entrar.' })
    }
  }

  return res.status(400).json({ error: 'Ação inválida. Use action: register ou login.' })
}
