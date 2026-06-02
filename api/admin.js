import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { action, table, data, match, returnSingle } = req.body;

  if (action === 'list_admins') {
    const { data: admins, error } = await supabase
      .from('admin_users')
      .select('id, name, pin, role, permissions, created_at')
      .order('created_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ data: admins.filter(a => a.role !== 'master') });
  }

  if (action === 'check_pin_unique') {
    const { pin } = req.body;
    if (pin === process.env.ADMIN_PIN) return res.status(200).json({ unique: false });
    const { data: existing } = await supabase.from('admin_users').select('id').eq('pin', pin).limit(1);
    return res.status(200).json({ unique: !existing || existing.length === 0 });
  }

  if (action === 'list_support') {
    const { data, error } = await supabase
      .from('support_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ data: data || [] });
  }

  const allowedTables = [
    'materials',
    'reflections',
    'phases',
    'config',
    'admin_users',
    'support_requests',
    'videos',
    'video_events',
    'video_questions',
  ];
  if (!allowedTables.includes(table)) {
    return res.status(400).json({ error: 'Tabela não permitida' });
  }

  try {
    let result;
    switch (action) {
      case 'select': {
        let q = supabase.from(table).select(data?.select || '*');
        const order = data?.order;
        if (order?.column) {
          q = q.order(order.column, { ascending: order.ascending !== false });
        }
        const range = data?.range;
        if (range && typeof range.from === 'number' && typeof range.to === 'number') {
          q = q.range(range.from, range.to);
        }
        const filters = data?.filters;
        if (filters && typeof filters === 'object') {
          Object.entries(filters).forEach(([k, v]) => {
            if (v == null) return;
            if (Array.isArray(v)) q = q.in(k, v);
            else q = q.eq(k, v);
          });
        }
        const ilike = data?.ilike;
        if (ilike?.column && typeof ilike?.pattern === 'string') {
          q = q.ilike(ilike.column, ilike.pattern);
        }
        result = await q;
        break;
      }
      case 'insert': {
        let q = supabase.from(table).insert(data).select();
        if (returnSingle) q = q.single();
        result = await q;
        break;
      }
      case 'update': {
        let q = supabase.from(table).update(data);
        if (match) Object.entries(match).forEach(([k, v]) => { q = q.eq(k, v); });
        result = await q.select();
        break;
      }
      case 'delete': {
        let q = supabase.from(table).delete();
        if (match) Object.entries(match).forEach(([k, v]) => { q = q.eq(k, v); });
        result = await q;
        break;
      }
      case 'upsert': {
        result = await supabase.from(table).upsert(data).select();
        break;
      }
      default:
        return res.status(400).json({ error: 'Ação inválida' });
    }

    if (result.error) return res.status(500).json({ error: result.error.message });
    return res.status(200).json({ data: result.data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
