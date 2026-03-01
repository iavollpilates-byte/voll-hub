import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!token || token !== process.env.ADMIN_TOKEN) return res.status(401).json({ error: 'Unauthorized' })

  const columns = [
    { name: 'onboarding_done', type: 'boolean', default: 'false' },
    { name: 'seen_hub_once', type: 'boolean', default: 'false' },
    { name: 'photo_announce_seen', type: 'boolean', default: 'false' },
    { name: 'ref_votes', type: 'jsonb', default: "'{}'" },
  ]

  const results = []
  for (const col of columns) {
    const sql = `ALTER TABLE leads ADD COLUMN IF NOT EXISTS ${col.name} ${col.type} DEFAULT ${col.default}`
    const { error } = await supabase.rpc('exec_sql', { sql }).catch(() => ({ error: null }))
    if (error) {
      const { error: rawErr } = await supabase.from('leads').select(col.name).limit(1)
      if (rawErr && rawErr.message?.includes('does not exist')) {
        results.push({ column: col.name, status: 'needs_manual_add', hint: sql })
      } else {
        results.push({ column: col.name, status: 'already_exists' })
      }
    } else {
      results.push({ column: col.name, status: 'added' })
    }
  }

  return res.status(200).json({ results, note: 'If status is needs_manual_add, run the SQL in the Supabase SQL Editor.' })
}
