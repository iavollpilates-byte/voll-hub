/**
 * POST /api/estudante-magic-link
 * Body: { email: string }
 * Finds estudante by email, creates a token, optionally sends magic link by email (Resend).
 * Returns: { ok: true, link, emailSent?: boolean } or { error: string }
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY; optional: RESEND_API_KEY, RESEND_FROM, ESTUDANTE_BASE_URL
 */
import { createClient } from '@supabase/supabase-js';

function getBaseUrl() {
  if (process.env.ESTUDANTE_BASE_URL) return process.env.ESTUDANTE_BASE_URL.replace(/\/$/, '');
  return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://rafael.grupovoll.com.br';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  const email = (req.body?.email || '').trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ error: 'E-mail é obrigatório.' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: estudante, error: errEst } = await supabase
    .from('estudantes')
    .select('id, name, email')
    .eq('email', email)
    .maybeSingle();

  if (errEst) {
    console.error('estudante-magic-link estudante lookup:', errEst);
    return res.status(500).json({ error: 'Erro ao buscar cadastro. Tente novamente.' });
  }
  if (!estudante) {
    return res.status(404).json({ error: 'E-mail não encontrado. Faça seu cadastro primeiro.' });
  }

  const token = crypto.randomUUID ? crypto.randomUUID() : `t_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { error: errToken } = await supabase.from('estudante_tokens').insert({
    estudante_id: estudante.id,
    token,
    expires_at: expiresAt.toISOString(),
  });

  if (errToken) {
    console.error('estudante-magic-link token insert:', errToken);
    return res.status(500).json({ error: 'Erro ao gerar link. Tente novamente.' });
  }

  const baseUrl = getBaseUrl();
  const link = `${baseUrl}/estudante?token=${token}`;

  let emailSent = false;
  const resendKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM || 'noreply@rafael.grupovoll.com.br';

  if (resendKey) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: resendFrom,
          to: [email],
          subject: 'Seu link de acesso – Área do Estudante',
          html: `
            <p>Olá${estudante.name ? `, ${estudante.name}` : ''}!</p>
            <p>Use o link abaixo para acessar a área do estudante:</p>
            <p><a href="${link}">Acessar minha área</a></p>
            <p>Ou copie e cole no navegador:</p>
            <p style="word-break:break-all;color:#666;">${link}</p>
            <p>Este link é válido por 7 dias. Se você não solicitou este e-mail, pode ignorá-lo.</p>
          `,
        }),
      });
      if (r.ok) {
        const data = await r.json();
        if (data.id) emailSent = true;
      }
    } catch (e) {
      console.error('estudante-magic-link Resend error:', e);
    }
  }

  return res.status(200).json({
    ok: true,
    link,
    emailSent,
    message: emailSent
      ? 'Link enviado para seu e-mail. Verifique a caixa de entrada (e o spam).'
      : 'Link gerado. Use o botão abaixo para acessar (configure RESEND_API_KEY para enviar por e-mail).',
  });
}
