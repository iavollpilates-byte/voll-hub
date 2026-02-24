import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { pin } = req.body;
  if (!pin) return res.status(400).json({ error: 'PIN obrigatório' });

  if (pin === process.env.ADMIN_PIN) {
    return res.status(200).json({
      token: process.env.ADMIN_TOKEN,
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

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await supabase.from('admin_users').select('id, name, pin, role, permissions').eq('pin', pin).limit(1);

  if (data && data.length > 0) {
    return res.status(200).json({
      token: process.env.ADMIN_TOKEN,
      admin: {
        id: data[0].id,
        name: data[0].name,
        role: data[0].role,
        permissions: data[0].permissions || {}
      }
    });
  }

  return res.status(401).json({ error: 'PIN incorreto' });
}
