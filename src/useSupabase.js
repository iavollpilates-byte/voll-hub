import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './supabaseClient'

// ─── HELPERS: convert DB row ↔ app object ───
const matFromDb = (r) => ({
  id: r.id, title: r.title, description: r.description, category: r.category, icon: r.icon, date: r.date,
  active: r.active, unlockType: r.unlock_type, socialMethod: r.social_method,
  surveyQuestions: r.survey_questions || [], downloadUrl: r.download_url || '',
  expiresAt: r.expires_at, limitQty: r.limit_qty, limitUsed: r.limit_used,
  isFlash: r.is_flash, flashUntil: r.flash_until,
  previewBullets: r.preview_bullets || [], previewImages: r.preview_images || [],
  sortOrder: r.sort_order, createdAt: new Date(r.created_at).getTime(),
  instaPostUrl: r.insta_post_url || '', instaViews: r.insta_views || 0, instaLikes: r.insta_likes || 0, instaComments: r.insta_comments || 0, instaSaves: r.insta_saves || 0,
  creditCost: r.credit_cost ?? 1,
  funnel: r.funnel || null,
})

const matToDb = (m) => ({
  title: m.title, description: m.description || '', category: m.category || '', icon: m.icon || '📄',
  date: m.date || '', active: m.active !== false, unlock_type: m.unlockType || 'free',
  social_method: m.socialMethod || null, survey_questions: m.surveyQuestions || [],
  download_url: m.downloadUrl || '', expires_at: m.expiresAt || null,
  limit_qty: m.limitQty || null, limit_used: m.limitUsed || 0,
  is_flash: m.isFlash || false, flash_until: m.flashUntil || null,
  preview_bullets: m.previewBullets || [], preview_images: m.previewImages || [],
  sort_order: m.sortOrder || 0,
  insta_post_url: m.instaPostUrl || '', insta_views: m.instaViews || 0, insta_likes: m.instaLikes || 0, insta_comments: m.instaComments || 0, insta_saves: m.instaSaves || 0,
  credit_cost: m.creditCost ?? 1,
  funnel: m.funnel || null,
})

const leadFromDb = (r) => {
  let pr = r.phase_responses || {}
  if (Object.keys(pr).length === 0 && (r.phase1_complete || r.phase2_complete || r.phase3_complete)) {
    if (r.phase1_complete) pr["1"] = { q1: r.grau || '', q2: r.formacao || '', q3: r.atua_pilates || '', completed_at: r.last_visit || 'migrated' }
    if (r.phase2_complete) pr["2"] = { q1: r.tem_studio || '', q2: r.maior_desafio || '', q3: r.tipo_conteudo || '', completed_at: r.last_visit || 'migrated' }
    if (r.phase3_complete) pr["3"] = { q1: r.pergunta_mentoria || '', q2: r.maior_sonho || '', q3: r.prof_admira || '', completed_at: r.last_visit || 'migrated' }
  }
  return {
    id: r.id, name: r.name, whatsapp: r.whatsapp, downloads: r.downloads || [],
    visits: r.visits, firstVisit: r.first_visit, lastVisit: r.last_visit, source: r.source,
    city: r.city, role: r.role, studioName: r.studio_name, studentsCount: r.students_count,
    goals: r.goals, surveyResponses: r.survey_responses || {},
    grau: r.grau || '', formacao: r.formacao || '', atuaPilates: r.atua_pilates || '',
    temStudio: r.tem_studio || '', maiorDesafio: r.maior_desafio || '', tipoConteudo: r.tipo_conteudo || '',
    perguntaMentoria: r.pergunta_mentoria || '', maiorSonho: r.maior_sonho || '', profAdmira: r.prof_admira || '',
    phase1Complete: !!r.phase1_complete, phase2Complete: !!r.phase2_complete, phase3Complete: !!r.phase3_complete,
    phaseResponses: pr,
    credits: r.credits ?? 3, creditsEarned: r.credits_earned || {},
    streakCount: r.streak_count || 0, streakLastDate: r.streak_last_date || '', streakBest: r.streak_best || 0,
    totalDays: r.total_days || 0, reflectionsRead: r.reflections_read || [], milestonesAchieved: r.milestones_achieved || [],
    avatarUrl: r.avatar_url || '',
    onboardingDone: !!r.onboarding_done,
    seenHubOnce: !!r.seen_hub_once,
    photoAnnounceSeen: !!r.photo_announce_seen,
    refVotes: r.ref_votes || {},
    createdAt: r.created_at, updatedAt: r.updated_at,
  }
}

const phaseFromDb = (r) => ({
  id: r.id, title: r.title, icon: r.icon || '📋', prize: r.prize || '', prizeUrl: r.prize_url || '',
  credits: r.credits ?? 2, sortOrder: r.sort_order ?? 0, active: r.active !== false,
  questions: r.questions || [], ctaText: r.cta_text || '', createdAt: r.created_at,
})

const leadToDb = (l) => ({
  name: l.name, whatsapp: l.whatsapp, email: l.email || '', downloads: l.downloads || [],
  visits: l.visits || 1, first_visit: l.firstVisit || '', last_visit: l.lastVisit || '',
  source: l.source || 'direct', city: l.city || '', role: l.role || '',
  studio_name: l.studioName || '', students_count: l.studentsCount || '',
  goals: l.goals || '', survey_responses: l.surveyResponses || {},
  grau: l.grau || '', formacao: l.formacao || '', atua_pilates: l.atuaPilates || '',
  tem_studio: l.temStudio || '', maior_desafio: l.maiorDesafio || '', tipo_conteudo: l.tipoConteudo || '',
  pergunta_mentoria: l.perguntaMentoria || '', maior_sonho: l.maiorSonho || '', prof_admira: l.profAdmira || '',
  phase1_complete: !!l.phase1Complete, phase2_complete: !!l.phase2Complete, phase3_complete: !!l.phase3Complete,
  phase_responses: l.phaseResponses || {},
  credits: l.credits ?? 3, credits_earned: l.creditsEarned || {},
  streak_count: l.streakCount || 0, streak_last_date: l.streakLastDate || '', streak_best: l.streakBest || 0,
  total_days: l.totalDays || 0, reflections_read: l.reflectionsRead || [], milestones_achieved: l.milestonesAchieved || [],
  ...(l.onboardingDone !== undefined && { onboarding_done: !!l.onboardingDone }),
  ...(l.seenHubOnce !== undefined && { seen_hub_once: !!l.seenHubOnce }),
  ...(l.photoAnnounceSeen !== undefined && { photo_announce_seen: !!l.photoAnnounceSeen }),
  ...(l.refVotes !== undefined && { ref_votes: l.refVotes }),
})

// Payload sem email/credits/credits_earned para DB que ainda não rodou a migração
const leadToDbMinimal = (l) => {
  const full = leadToDb(l)
  const { email, credits, credits_earned, ...rest } = full
  return rest
}

const adminFromDb = (r) => ({
  id: r.id, name: r.name, pin: r.pin, role: r.role, permissions: r.permissions || {},
})

// Em dev o React.StrictMode dispara efeitos 2x; compartilhamos a mesma carga para não duplicar requisições ao Supabase
let loadAllPromise = null

function withTimeout(ms, promise) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms)
    promise.then((res) => { clearTimeout(t); resolve(res) }).catch((err) => { clearTimeout(t); reject(err) })
  })
}

// ─── HOOK ───
export function useSupabase() {
  const [materials, setMaterials] = useState([])
  const [leads, setLeads] = useState([])
  const [adminUsers, setAdminUsers] = useState([])
  const [config, setConfig] = useState({})
  const [reflections, setReflections] = useState([])
  const [phases, setPhases] = useState([])
  const [supportRequests, setSupportRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [leadsLoading, setLeadsLoading] = useState(false)
  const [leaderboard, setLeaderboard] = useState([])

  // ─── ADMIN TOKEN (for secure server-side operations) ───
  const adminTokenRef = useRef(null)
  const setAdminToken = (token) => { adminTokenRef.current = token }

  const adminFetch = async (body) => {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminTokenRef.current}`
      },
      body: JSON.stringify(body)
    })
    let result = null
    try {
      result = await res.json()
    } catch (_) {
      result = null
    }
    if (!res.ok) throw new Error(result.error || 'Erro na API admin')
    return result
  }

  // ─── LOAD ALL (public data only — no leads; admin loads leads via loadLeads) ───
  const loadAll = useCallback(async () => {
    try {
      setLoading(true)
      const dataPromise = Promise.all([
        supabase.from('materials').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false }),
        supabase.from('config').select('*'),
        supabase.from('reflections').select('*').order('publish_date', { ascending: false }),
        supabase.from('phases').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
      ])
      const [matRes, cfgRes, refRes, phaseRes] = await withTimeout(45000, dataPromise)
      if (matRes.error) throw matRes.error
      if (cfgRes.error) throw cfgRes.error

      const materialsData = (matRes.data || []).map(matFromDb)
      const reflectionsData = (refRes.data || []).map(r => ({ id: r.id, title: r.title, body: r.body, actionText: r.action_text || '', quote: r.quote || '', inspiration: r.inspiration || '', publishDate: r.publish_date, active: r.active, likes: r.likes || 0, dislikes: r.dislikes || 0, imageUrl: r.image_url || '', createdAt: r.created_at }))
      const phasesData = (phaseRes.data || []).map(phaseFromDb)

      const cfgObj = {}
      ;(cfgRes.data || []).forEach(r => {
        const keyName = 'key' in r ? 'key' : 'Key' in r ? 'Key' : null
        const valName = 'value' in r ? 'value' : 'Value' in r ? 'Value' : null
        const k = keyName != null ? r[keyName] : r.key
        const v = valName != null ? r[valName] : r.value
        if (k != null && k !== '') {
          cfgObj[k] = v
          cfgObj[String(k).toLowerCase()] = v
        }
      })

      setMaterials(materialsData)
      setReflections(reflectionsData)
      setPhases(phasesData)
      setConfig(cfgObj)
      setError(null)

      if (adminTokenRef.current) {
        try {
          const result = await adminFetch({ action: 'list_admins' })
          if (result.data) setAdminUsers(result.data.map(adminFromDb))
        } catch (_) {}
      }
      return { materials: materialsData, reflections: reflectionsData, phases: phasesData, config: cfgObj }
    } catch (e) {
      console.error('Supabase load error:', e)
      setError(e.message === 'timeout' ? 'Demorou demais. Tente recarregar.' : e.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!loadAllPromise) loadAllPromise = loadAll()
    const apply = (result) => {
      if (result) {
        setMaterials(result.materials)
        setReflections(result.reflections)
        setPhases(result.phases)
        setConfig(result.config)
        setError(null)
      }
      setLoading(false)
    }
    loadAllPromise.then(apply).catch(() => setLoading(false))
  }, [loadAll])

  const loadLeads = useCallback(async (offset = 0, limit = 1000, append = false) => {
    if (!adminTokenRef.current) return
    try {
      setLeadsLoading(true)
      const result = await adminFetch({ action: 'list_leads', limit, offset })
      const data = result.data || []
      if (append && offset > 0) setLeads(prev => [...prev, ...data])
      else setLeads(data)
    } catch (e) {
      console.error('loadLeads error:', e)
    } finally {
      setLeadsLoading(false)
    }
  }, [])

  const fetchLeaderboard = useCallback(async (opts = {}) => {
    const limit = opts.limit || 50
    const me = opts.me ? encodeURIComponent(opts.me) : ''
    const url = `/api/leaderboard?limit=${limit}${me ? `&me=${me}` : ''}`
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Leaderboard failed')
      const data = await res.json()
      setLeaderboard(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('fetchLeaderboard error:', e)
      setLeaderboard([])
    }
  }, [])

  // ─── ADMIN USERS (loaded via secure API) ───
  const loadAdminUsers = async () => {
    try {
      const result = await adminFetch({ action: 'list_admins' })
      if (result.data) setAdminUsers(result.data.map(adminFromDb))
    } catch (e) { console.error('Failed to load admin users:', e) }
  }

  const loadSupportRequests = async () => {
    try {
      const result = await adminFetch({ action: 'list_support' })
      setSupportRequests(result.data || [])
    } catch (e) { console.error('Failed to load support requests:', e) }
  }

  const checkPinUnique = async (pin) => {
    try {
      const result = await adminFetch({ action: 'check_pin_unique', pin })
      return result.unique
    } catch (_) { return false }
  }

  const addAdminUser = async (user) => {
    try {
      const result = await adminFetch({
        action: 'insert', table: 'admin_users',
        data: { name: user.name, pin: user.pin, role: 'admin', permissions: user.permissions },
        returnSingle: true
      })
      const newUser = adminFromDb(result.data)
      setAdminUsers(p => [...p, newUser])
      return newUser
    } catch (e) { console.error(e); return null }
  }

  const updateAdminUser = async (id, updates) => {
    try {
      await adminFetch({ action: 'update', table: 'admin_users', data: updates, match: { id } })
      setAdminUsers(p => p.map(u => u.id === id ? { ...u, ...updates } : u))
      return true
    } catch (e) { console.error(e); return false }
  }

  const deleteAdminUser = async (id) => {
    try {
      await adminFetch({ action: 'delete', table: 'admin_users', match: { id } })
      setAdminUsers(p => p.filter(u => u.id !== id))
      return true
    } catch (e) { console.error(e); return false }
  }

  // ─── MATERIALS ───
  const addMaterial = async (mat) => {
    const result = await adminFetch({
      action: 'insert', table: 'materials',
      data: matToDb(mat), returnSingle: true
    })
    const newMat = matFromDb(result.data)
    setMaterials(p => [newMat, ...p])
    return newMat
  }

  const updateMaterial = async (id, updates) => {
    const dbUpdates = {}
    const keyMap = {
      title: 'title', description: 'description', category: 'category', icon: 'icon', date: 'date',
      active: 'active', unlockType: 'unlock_type', socialMethod: 'social_method',
      surveyQuestions: 'survey_questions', downloadUrl: 'download_url',
      expiresAt: 'expires_at', limitQty: 'limit_qty', limitUsed: 'limit_used',
      isFlash: 'is_flash', flashUntil: 'flash_until',
      previewBullets: 'preview_bullets', previewImages: 'preview_images', sortOrder: 'sort_order',
      instaPostUrl: 'insta_post_url', instaViews: 'insta_views', instaLikes: 'insta_likes', instaComments: 'insta_comments', instaSaves: 'insta_saves',
      creditCost: 'credit_cost',
      funnel: 'funnel',
    }
    Object.entries(updates).forEach(([k, v]) => {
      if (keyMap[k]) dbUpdates[keyMap[k]] = v
    })

    if (adminTokenRef.current) {
      try {
        await adminFetch({ action: 'update', table: 'materials', data: dbUpdates, match: { id } })
        setMaterials(p => p.map(m => m.id === id ? { ...m, ...updates } : m))
        return true
      } catch (e) { console.error(e); return false }
    }

    const { error } = await supabase.from('materials').update(dbUpdates).eq('id', id)
    if (error) { console.error(error); return false }
    setMaterials(p => p.map(m => m.id === id ? { ...m, ...updates } : m))
    return true
  }

  const deleteMaterial = async (id) => {
    let removedMaterial = null
    setMaterials((p) => {
      const found = p.find((m) => m.id === id)
      if (found) removedMaterial = found
      return p.filter((m) => m.id !== id)
    })
    try {
      await adminFetch({ action: 'delete', table: 'materials', match: { id } })
      return true
    } catch (e) {
      console.error(e)
      if (removedMaterial) setMaterials((p) => [...p, removedMaterial])
      return false
    }
  }

  // ─── LEADS (user-facing — direct Supabase) ───
  const addLead = async (lead) => {
    let payload = leadToDb(lead)
    let result = await supabase.from('leads').insert(payload).select().single()
    if (result.error) {
      const msg = (result.error.message || '').toLowerCase()
      const code = result.error.code || ''
      const missingColumn = msg.includes('column') || msg.includes('does not exist') || code === '42703'
      if (missingColumn) {
        payload = leadToDbMinimal(lead)
        result = await supabase.from('leads').insert(payload).select().single()
      }
    }
    if (result.error) { console.error('addLead error:', result.error); return null }
    const newLead = leadFromDb(result.data)
    setLeads(p => [newLead, ...p])
    return newLead
  }

  const updateLead = async (id, updates) => {
    const dbUpdates = {}
    const keyMap = {
      name: 'name', whatsapp: 'whatsapp', email: 'email', downloads: 'downloads', visits: 'visits',
      firstVisit: 'first_visit', lastVisit: 'last_visit', source: 'source',
      city: 'city', role: 'role', studioName: 'studio_name', studentsCount: 'students_count',
      goals: 'goals', surveyResponses: 'survey_responses',
      grau: 'grau', formacao: 'formacao', atuaPilates: 'atua_pilates',
      temStudio: 'tem_studio', maiorDesafio: 'maior_desafio', tipoConteudo: 'tipo_conteudo',
      perguntaMentoria: 'pergunta_mentoria', maiorSonho: 'maior_sonho', profAdmira: 'prof_admira',
      phase1Complete: 'phase1_complete', phase2Complete: 'phase2_complete', phase3Complete: 'phase3_complete',
      phaseResponses: 'phase_responses',
      credits: 'credits', creditsEarned: 'credits_earned',
      streakCount: 'streak_count', streakLastDate: 'streak_last_date', streakBest: 'streak_best',
      totalDays: 'total_days', reflectionsRead: 'reflections_read', milestonesAchieved: 'milestones_achieved',
      avatarUrl: 'avatar_url',
      onboardingDone: 'onboarding_done', seenHubOnce: 'seen_hub_once', photoAnnounceSeen: 'photo_announce_seen', refVotes: 'ref_votes',
    }
    Object.entries(updates).forEach(([k, v]) => {
      if (keyMap[k]) dbUpdates[keyMap[k]] = v
    })
    dbUpdates.updated_at = new Date().toISOString()
    const { error } = await supabase.from('leads').update(dbUpdates).eq('id', id)
    if (error) { console.error(error); return false }
    setLeads(p => p.map(l => l.id === id ? { ...l, ...updates } : l))
    return true
  }

  const findLeadByWhatsApp = async (wa) => {
    const digits = String(wa).replace(/\D/g, '')
    const candidates = []
    if (digits.length >= 10) {
      candidates.push(digits)
      if (digits.length === 11) candidates.push('55' + digits)
      if (digits.length === 13 && digits.startsWith('55')) candidates.push(digits.slice(2))
    }
    const unique = [...new Set(candidates)]
    if (unique.length === 0) return null

    const { data } = await supabase.from('leads').select('*').in('whatsapp', unique).limit(1)
    if (data && data.length > 0) return leadFromDb(data[0])
    return null
  }

  // ─── REFLECTIONS ───
  const addReflection = async (ref) => {
    const row = { title: ref.title, body: ref.body, action_text: ref.actionText || '', quote: ref.quote || '', inspiration: ref.inspiration || '', publish_date: ref.publishDate, active: ref.active !== false, likes: 0, dislikes: 0, image_url: ref.imageUrl || '' }
    try {
      const result = await adminFetch({
        action: 'insert', table: 'reflections',
        data: row, returnSingle: true
      })
      const newRef = { id: result.data.id, title: result.data.title, body: result.data.body, actionText: result.data.action_text || '', quote: result.data.quote || '', inspiration: result.data.inspiration || '', publishDate: result.data.publish_date, active: result.data.active, likes: result.data.likes || 0, dislikes: result.data.dislikes || 0, imageUrl: result.data.image_url || '', createdAt: result.data.created_at }
      setReflections(p => [newRef, ...p])
      return newRef
    } catch (e) { console.error(e); return null }
  }

  const updateReflection = async (id, updates) => {
    const dbUpdates = {}
    const keyMap = { title: 'title', body: 'body', actionText: 'action_text', quote: 'quote', inspiration: 'inspiration', publishDate: 'publish_date', active: 'active', likes: 'likes', dislikes: 'dislikes', imageUrl: 'image_url' }
    Object.entries(updates).forEach(([k, v]) => { if (keyMap[k]) dbUpdates[keyMap[k]] = v })

    if (adminTokenRef.current) {
      try {
        await adminFetch({ action: 'update', table: 'reflections', data: dbUpdates, match: { id } })
        setReflections(p => p.map(r => r.id === id ? { ...r, ...updates } : r))
        return true
      } catch (e) { console.error(e); return false }
    }

    const { error } = await supabase.from('reflections').update(dbUpdates).eq('id', id)
    if (error) { console.error(error); return false }
    setReflections(p => p.map(r => r.id === id ? { ...r, ...updates } : r))
    return true
  }

  const deleteReflection = async (id) => {
    try {
      await adminFetch({ action: 'delete', table: 'reflections', match: { id } })
      setReflections(p => p.filter(r => r.id !== id))
      return true
    } catch (e) { console.error(e); return false }
  }

  const likeReflection = async (id, isLike) => {
    const ref = reflections?.find(r => r.id === id) || (await supabase.from('reflections').select('*').eq('id', id).single()).data
    if (!ref) return false
    const field = isLike ? 'likes' : 'dislikes'
    const current = isLike ? (ref.likes || 0) : (ref.dislikes || 0)
    const { error } = await supabase.from('reflections').update({ [field]: current + 1 }).eq('id', id)
    if (error) { console.error(error); return false }
    setReflections(p => p.map(r => r.id === id ? { ...r, [field]: (r[field] || 0) + 1 } : r))
    return true
  }

  // ─── PHASES ───
  const addPhase = async (phase) => {
    const row = { title: phase.title, icon: phase.icon || '📋', prize: phase.prize || '', prize_url: phase.prizeUrl || '', credits: phase.credits ?? 2, sort_order: phase.sortOrder ?? 0, active: phase.active !== false, questions: phase.questions || [], cta_text: phase.ctaText || '' }
    try {
      const result = await adminFetch({
        action: 'insert', table: 'phases',
        data: row, returnSingle: true
      })
      const newPhase = phaseFromDb(result.data)
      setPhases(p => [...p, newPhase].sort((a, b) => a.sortOrder - b.sortOrder))
      return newPhase
    } catch (e) { console.error(e); return null }
  }

  const updatePhase = async (id, updates) => {
    const dbUpdates = {}
    const keyMap = { title: 'title', icon: 'icon', prize: 'prize', prizeUrl: 'prize_url', credits: 'credits', sortOrder: 'sort_order', active: 'active', questions: 'questions', ctaText: 'cta_text' }
    Object.entries(updates).forEach(([k, v]) => { if (keyMap[k]) dbUpdates[keyMap[k]] = v })
    try {
      await adminFetch({ action: 'update', table: 'phases', data: dbUpdates, match: { id } })
      setPhases(p => p.map(ph => ph.id === id ? { ...ph, ...updates } : ph).sort((a, b) => a.sortOrder - b.sortOrder))
      return true
    } catch (e) { console.error(e); return false }
  }

  const deletePhase = async (id) => {
    try {
      await adminFetch({ action: 'delete', table: 'phases', match: { id } })
      setPhases(p => p.filter(ph => ph.id !== id))
      return true
    } catch (e) { console.error(e); return false }
  }

  // ─── CONFIG ───
  const updateConfig = async (key, value) => {
    if (adminTokenRef.current) {
      try {
        await adminFetch({
          action: 'upsert', table: 'config',
          data: { key, value: String(value), updated_at: new Date().toISOString() }
        })
        setConfig(p => ({ ...p, [key]: String(value) }))
        return true
      } catch (e) { console.error(e); return false }
    }
    const { error } = await supabase.from('config').upsert({ key, value: String(value), updated_at: new Date().toISOString() })
    if (error) { console.error(error); return false }
    setConfig(p => ({ ...p, [key]: String(value) }))
    return true
  }

  const updateConfigBatch = async (updates) => {
    const rows = Object.entries(updates).map(([key, value]) => ({
      key, value: String(value), updated_at: new Date().toISOString()
    }))
    if (adminTokenRef.current) {
      try {
        await adminFetch({ action: 'upsert', table: 'config', data: rows })
        setConfig(p => {
          const next = { ...p }
          Object.entries(updates).forEach(([k, v]) => { next[k] = String(v) })
          return next
        })
        return true
      } catch (e) { console.error(e); return false }
    }
    const { error } = await supabase.from('config').upsert(rows)
    if (error) { console.error(error); return false }
    setConfig(p => {
      const next = { ...p }
      Object.entries(updates).forEach(([k, v]) => { next[k] = String(v) })
      return next
    })
    return true
  }

  // ─── STORAGE ───
  const uploadReflectionImage = async (reflectionId, styleIndex, blob) => {
    const path = `${reflectionId}/style_${styleIndex}.png`
    const { error } = await supabase.storage
      .from('reflection-images')
      .upload(path, blob, { contentType: 'image/png', upsert: true })
    if (error) { console.error('Upload error:', error); return null }
    const { data: urlData } = supabase.storage
      .from('reflection-images')
      .getPublicUrl(path)
    return urlData?.publicUrl || null
  }

  const uploadOgImage = async (blob) => {
    const path = 'og/latest.png'
    const { error } = await supabase.storage
      .from('reflection-images')
      .upload(path, blob, { contentType: 'image/png', upsert: true })
    if (error) console.error('OG image upload error:', error)
  }

  // Profile photo: bucket "profile-photos" must exist and be public (Supabase Dashboard > Storage)
  const uploadProfilePhoto = async (leadId, file) => {
    const ext = (file.name || '').split('.').pop()?.toLowerCase() || 'jpg'
    const contentType = file.type || (ext === 'png' ? 'image/png' : 'image/jpeg')
    const path = `${leadId}/avatar.${ext}`
    const { error } = await supabase.storage
      .from('profile-photos')
      .upload(path, file, { contentType, upsert: true })
    if (error) { console.error('Profile photo upload error:', error); return null }
    const { data: urlData } = supabase.storage.from('profile-photos').getPublicUrl(path)
    return urlData?.publicUrl || null
  }

  return {
    materials, leads, adminUsers, config, reflections, phases, supportRequests, loading, error,
    leaderboard, leadsLoading, loadLeads, fetchLeaderboard,
    setMaterials, setLeads, setPhases,
    addMaterial, updateMaterial, deleteMaterial,
    addLead, updateLead, findLeadByWhatsApp,
    addAdminUser, updateAdminUser, deleteAdminUser,
    loadAdminUsers, loadSupportRequests, checkPinUnique,
    addReflection, updateReflection, deleteReflection, likeReflection,
    addPhase, updatePhase, deletePhase,
    uploadReflectionImage, uploadOgImage, uploadProfilePhoto,
    updateConfig, updateConfigBatch,
    setAdminToken,
    incrementPageView: async () => {
      try {
        const { data } = await supabase.from('config').select('*').eq('key', 'pageViews').limit(1)
        const current = data && data[0] ? parseInt(data[0].value) || 0 : 0
        if (data && data[0]) {
          await supabase.from('config').update({ value: String(current + 1) }).eq('key', 'pageViews')
        } else {
          await supabase.from('config').insert({ key: 'pageViews', value: '1' })
        }
      } catch(e) {}
    },
    reload: loadAll,
  }
}
