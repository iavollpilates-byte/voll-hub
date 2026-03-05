import { createClient } from '@supabase/supabase-js'
import { verifyContratosToken } from './contratos-auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const payload = await verifyContratosToken(req.headers.authorization)
  if (!payload?.userId) return res.status(401).json({ error: 'Não autorizado.' })

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: 'Serviço não configurado.' })
  const supabase = createClient(supabaseUrl, supabaseKey)
  const body = req.body || {}
  const student_id = body.student_id != null ? Number(body.student_id) : null
  const file_path = (body.file_path || '').toString().trim() || ''
  const { error } = await supabase.from('contratos_generated').insert({
    user_id: payload.userId,
    student_id: student_id || null,
    file_path: file_path || 'gerado-local',
  })
  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ ok: true })
}
