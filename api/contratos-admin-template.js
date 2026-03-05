import { verifyAdminContratos, getSupabaseAdmin } from './lib/contratos-admin-auth.js'

export default async function handler(req, res) {
  const payload = await verifyAdminContratos(req)
  if (!payload) return res.status(401).json({ error: 'Não autorizado.' })

  const supabase = getSupabaseAdmin()
  if (!supabase) return res.status(500).json({ error: 'Serviço não configurado.' })

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('contratos_template')
      .select('id, body, optionals, updated_at')
      .limit(1)
      .maybeSingle()
    if (error) return res.status(500).json({ error: error.message })
    if (!data) return res.status(200).json({ template: { body: '', optionals: [] } })
    return res.status(200).json({
      template: {
        id: data.id,
        body: data.body || '',
        optionals: data.optionals || [],
        updated_at: data.updated_at,
      },
    })
  }

  if (req.method === 'PUT') {
    const body = req.body || {}
    const templateBody = typeof body.body === 'string' ? body.body : ''
    const optionals = Array.isArray(body.optionals) ? body.optionals : []
    const { data: existing } = await supabase.from('contratos_template').select('id').limit(1).maybeSingle()
    const row = { body: templateBody, optionals, updated_at: new Date().toISOString() }
    let result
    if (existing) {
      result = await supabase.from('contratos_template').update(row).eq('id', existing.id).select().single()
    } else {
      result = await supabase.from('contratos_template').insert(row).select().single()
    }
    if (result.error) return res.status(500).json({ error: result.error.message })
    return res.status(200).json({ template: { id: result.data.id, body: result.data.body, optionals: result.data.optionals, updated_at: result.data.updated_at } })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
