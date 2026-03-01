import { createClient } from '@supabase/supabase-js';

// GET /api/leaderboard — público, só campos seguros (nome, avatar, números agregados)
// Query: ?limit=20&me=whatsapp (opcional: marcar isMe sem expor whatsapp na resposta)
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const meWhatsApp = req.query.me ? String(req.query.me).trim() : null;

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: rows, error } = await supabase
    .from('leads')
    .select('name, avatar_url, reflections_read, downloads, total_days, streak_count, streak_best, whatsapp')
    .not('name', 'is', null)
    .order('total_days', { ascending: false })
    .limit(limit * 3);

  if (error) return res.status(500).json({ error: error.message });

  const list = (rows || []).map((r) => {
    const reflectionsRead = r.reflections_read || [];
    const downloads = r.downloads || [];
    return {
      name: r.name || '',
      avatarUrl: r.avatar_url || '',
      reads: Array.isArray(reflectionsRead) ? reflectionsRead.length : 0,
      downloads: Array.isArray(downloads) ? downloads.length : 0,
      days: r.total_days || 0,
      streak: r.streak_count || 0,
      best: r.streak_best || 0,
      isMe: !!meWhatsApp && (r.whatsapp === meWhatsApp || normalizeWa(r.whatsapp) === normalizeWa(meWhatsApp)),
    };
  });

  const sorted = list.sort((a, b) => b.days - a.days).slice(0, limit);
  const out = sorted.map(({ name, avatarUrl, reads, downloads, days, streak, best, isMe }) => ({
    name, avatarUrl, reads, downloads, days, streak, best, isMe,
  }));

  return res.status(200).json(out);
}

function normalizeWa(wa) {
  const d = String(wa || '').replace(/\D/g, '');
  if (d.length === 13 && d.startsWith('55')) return d.slice(2);
  if (d.length === 11) return '55' + d;
  return d;
}
