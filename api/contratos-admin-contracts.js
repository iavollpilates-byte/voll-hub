import { verifyAdminContratos, getSupabaseAdmin } from './lib/contratos-admin-auth.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const payload = await verifyAdminContratos(req)
  if (!payload) return res.status(401).json({ error: 'Não autorizado.' })

  const supabase = getSupabaseAdmin()
  if (!supabase) return res.status(500).json({ error: 'Serviço não configurado.' })

  const { data, error } = await supabase
    .from('contratos_generated')
    .select(`
      id,
      user_id,
      student_id,
      file_path,
      created_at,
      contratos_users(name, email),
      contratos_students(nome)
    `)
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })

  const list = (data || []).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    student_id: r.student_id,
    file_path: r.file_path,
    created_at: r.created_at,
    user_name: r.contratos_users?.name,
    user_email: r.contratos_users?.email,
    student_name: r.contratos_students?.nome ?? (Array.isArray(r.contratos_students) ? r.contratos_students[0]?.nome : null),
  }))
  return res.status(200).json({ contracts: list })
}
