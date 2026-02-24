import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { pin } = req.body || {};
  if (!pin) return res.status(400).json({ error: 'PIN obrigatório' });

  const adminPin = process.env.ADMIN_PIN;
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) {
    return res.status(500).json({ error: 'ADMIN_TOKEN não configurado no Vercel. Defina em Settings > Environment Variables.' });
  }

  if (adminPin && pin === adminPin) {
    return res.status(200).json({
      token: adminToken,
      admin: {
        id: 0,
        name: process.env.ADMIN_MASTER_NAME || 'MASTER',
        role: 'master',
        permissions: {
          materials_view: true, materials_edit: true,
          leads_view: true, leads_export: true, leads_whatsapp: true,
          textos_edit: true, users_manage: true
        }
      }
    });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados no Vercel.' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.from('admin_users').select('id, name, pin, role, permissions').eq('pin', pin).limit(1);

    if (error) {
      return res.status(500).json({ error: 'Erro ao consultar usuários admin: ' + error.message });
    }
    if (data && data.length > 0) {
      return res.status(200).json({
        token: adminToken,
        admin: {
          id: data[0].id,
          name: data[0].name,
          role: data[0].role,
          permissions: data[0].permissions || {}
        }
      });
    }
  } catch (e) {
    return res.status(500).json({ error: 'Erro no servidor: ' + (e.message || String(e)) });
  }

  return res.status(401).json({ error: 'PIN incorreto' });
}
