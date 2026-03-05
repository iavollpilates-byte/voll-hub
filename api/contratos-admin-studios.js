import { verifyAdminContratos, getSupabaseAdmin } from './lib/contratos-admin-auth.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const payload = await verifyAdminContratos(req)
  if (!payload) return res.status(401).json({ error: 'Não autorizado.' })

  const supabase = getSupabaseAdmin()
  if (!supabase) return res.status(500).json({ error: 'Serviço não configurado.' })

  const { data: studios, error } = await supabase
    .from('contratos_studios')
    .select(`
      id,
      user_id,
      razao_social,
      nome_fantasia,
      endereco,
      cnpj,
      telefone,
      created_at,
      updated_at,
      contratos_users!inner(name, email)
    `)
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })

  const list = (studios || []).map((s) => {
    const { contratos_users, ...rest } = s
    return { ...rest, user_name: contratos_users?.name, user_email: contratos_users?.email }
  })
  return res.status(200).json({ studios: list })
}
