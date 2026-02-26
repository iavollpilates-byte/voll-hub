/**
 * POST /api/support — user submits report/suggestion (no auth).
 * Body: { type: "error" | "suggestion", message: string, name?: string, whatsapp?: string }
 * Inserts into support_requests. Admin sees submissions in CMS.
 */
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  const { type, message, name, whatsapp } = req.body || {};
  const validType = type === 'error' || type === 'suggestion';
  if (!validType || !message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Envie o tipo (erro ou sugestão) e a mensagem.' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { error } = await supabase.from('support_requests').insert({
    type: type === 'suggestion' ? 'suggestion' : 'error',
    message: String(message).trim().slice(0, 5000),
    user_name: name ? String(name).trim().slice(0, 200) : '',
    user_whatsapp: whatsapp ? String(whatsapp).trim().slice(0, 50) : '',
  });

  if (error) {
    console.error('Support insert error:', error);
    return res.status(500).json({ error: 'Não foi possível enviar. Tente novamente.' });
  }
  return res.status(200).json({ ok: true });
}
