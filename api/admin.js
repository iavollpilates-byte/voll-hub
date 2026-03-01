import { createClient } from '@supabase/supabase-js';

function leadFromDb(r) {
  let pr = r.phase_responses || {};
  if (Object.keys(pr).length === 0 && (r.phase1_complete || r.phase2_complete || r.phase3_complete)) {
    if (r.phase1_complete) pr['1'] = { q1: r.grau || '', q2: r.formacao || '', q3: r.atua_pilates || '', completed_at: r.last_visit || 'migrated' };
    if (r.phase2_complete) pr['2'] = { q1: r.tem_studio || '', q2: r.maior_desafio || '', q3: r.tipo_conteudo || '', completed_at: r.last_visit || 'migrated' };
    if (r.phase3_complete) pr['3'] = { q1: r.pergunta_mentoria || '', q2: r.maior_sonho || '', q3: r.prof_admira || '', completed_at: r.last_visit || 'migrated' };
  }
  return {
    id: r.id, name: r.name, whatsapp: r.whatsapp, downloads: r.downloads || [], visits: r.visits, firstVisit: r.first_visit, lastVisit: r.last_visit, source: r.source,
    city: r.city, role: r.role, studioName: r.studio_name, studentsCount: r.students_count, goals: r.goals, surveyResponses: r.survey_responses || {},
    grau: r.grau || '', formacao: r.formacao || '', atuaPilates: r.atua_pilates || '', temStudio: r.tem_studio || '', maiorDesafio: r.maior_desafio || '', tipoConteudo: r.tipo_conteudo || '',
    perguntaMentoria: r.pergunta_mentoria || '', maiorSonho: r.maior_sonho || '', profAdmira: r.prof_admira || '',
    phase1Complete: !!r.phase1_complete, phase2Complete: !!r.phase2_complete, phase3Complete: !!r.phase3_complete, phaseResponses: pr,
    credits: r.credits ?? 3, creditsEarned: r.credits_earned || {},
    streakCount: r.streak_count || 0, streakLastDate: r.streak_last_date || '', streakBest: r.streak_best || 0,
    totalDays: r.total_days || 0, reflectionsRead: r.reflections_read || [], milestonesAchieved: r.milestones_achieved || [],
    avatarUrl: r.avatar_url || '', createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

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

  if (action === 'list_leads') {
    const limit = Math.min(parseInt(req.body.limit, 10) || 1000, 2000);
    const offset = Math.max(0, parseInt(req.body.offset, 10) || 0);
    const { data: rows, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) return res.status(500).json({ error: error.message });
    const data = (rows || []).map((r) => leadFromDb(r));
    return res.status(200).json({ data });
  }

  const allowedTables = ['materials', 'reflections', 'phases', 'config', 'admin_users', 'support_requests'];
  if (!allowedTables.includes(table)) {
    return res.status(400).json({ error: 'Tabela não permitida' });
  }

  try {
    let result;
    switch (action) {
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
