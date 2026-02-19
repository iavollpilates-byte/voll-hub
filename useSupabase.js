import { useState, useEffect, useCallback } from 'react'
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
})

const leadFromDb = (r) => ({
  id: r.id, name: r.name, whatsapp: r.whatsapp, downloads: r.downloads || [],
  visits: r.visits, firstVisit: r.first_visit, lastVisit: r.last_visit, source: r.source,
  city: r.city, role: r.role, studioName: r.studio_name, studentsCount: r.students_count,
  goals: r.goals, surveyResponses: r.survey_responses || {},
})

const leadToDb = (l) => ({
  name: l.name, whatsapp: l.whatsapp, downloads: l.downloads || [],
  visits: l.visits || 1, first_visit: l.firstVisit || '', last_visit: l.lastVisit || '',
  source: l.source || 'direct', city: l.city || '', role: l.role || '',
  studio_name: l.studioName || '', students_count: l.studentsCount || '',
  goals: l.goals || '', survey_responses: l.surveyResponses || {},
})

const adminFromDb = (r) => ({
  id: r.id, name: r.name, pin: r.pin, role: r.role, permissions: r.permissions || {},
})

// ─── HOOK ───
export function useSupabase() {
  const [materials, setMaterials] = useState([])
  const [leads, setLeads] = useState([])
  const [adminUsers, setAdminUsers] = useState([])
  const [config, setConfig] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // ─── LOAD ALL ───
  const loadAll = useCallback(async () => {
    try {
      setLoading(true)
      const [matRes, leadRes, adminRes, cfgRes] = await Promise.all([
        supabase.from('materials').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false }),
        supabase.from('leads').select('*').order('created_at', { ascending: false }),
        supabase.from('admin_users').select('*').order('created_at', { ascending: true }),
        supabase.from('config').select('*'),
      ])
      if (matRes.error) throw matRes.error
      if (leadRes.error) throw leadRes.error
      if (adminRes.error) throw adminRes.error
      if (cfgRes.error) throw cfgRes.error

      setMaterials((matRes.data || []).map(matFromDb))
      setLeads((leadRes.data || []).map(leadFromDb))
      setAdminUsers((adminRes.data || []).filter(u => u.role !== 'master').map(adminFromDb))

      const cfgObj = {}
      ;(cfgRes.data || []).forEach(r => { cfgObj[r.key] = r.value })
      setConfig(cfgObj)
      setError(null)
    } catch (e) {
      console.error('Supabase load error:', e)
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // ─── MATERIALS ───
  const addMaterial = async (mat) => {
    const { data, error } = await supabase.from('materials').insert(matToDb(mat)).select().single()
    if (error) { console.error(error); return null }
    const newMat = matFromDb(data)
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
    }
    Object.entries(updates).forEach(([k, v]) => {
      if (keyMap[k]) dbUpdates[keyMap[k]] = v
    })
    const { error } = await supabase.from('materials').update(dbUpdates).eq('id', id)
    if (error) { console.error(error); return false }
    setMaterials(p => p.map(m => m.id === id ? { ...m, ...updates } : m))
    return true
  }

  const deleteMaterial = async (id) => {
    const { error } = await supabase.from('materials').delete().eq('id', id)
    if (error) { console.error(error); return false }
    setMaterials(p => p.filter(m => m.id !== id))
    return true
  }

  // ─── LEADS ───
  const addLead = async (lead) => {
    const { data, error } = await supabase.from('leads').insert(leadToDb(lead)).select().single()
    if (error) { console.error(error); return null }
    const newLead = leadFromDb(data)
    setLeads(p => [newLead, ...p])
    return newLead
  }

  const updateLead = async (id, updates) => {
    const dbUpdates = {}
    const keyMap = {
      name: 'name', whatsapp: 'whatsapp', downloads: 'downloads', visits: 'visits',
      firstVisit: 'first_visit', lastVisit: 'last_visit', source: 'source',
      city: 'city', role: 'role', studioName: 'studio_name', studentsCount: 'students_count',
      goals: 'goals', surveyResponses: 'survey_responses',
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
    const { data } = await supabase.from('leads').select('*').eq('whatsapp', wa).limit(1)
    return data && data.length > 0 ? leadFromDb(data[0]) : null
  }

  // ─── ADMIN USERS ───
  const authenticateAdmin = async (pin) => {
    const { data } = await supabase.from('admin_users').select('*').eq('pin', pin).limit(1)
    if (data && data.length > 0) return adminFromDb(data[0])
    return null
  }

  const addAdminUser = async (user) => {
    const { data, error } = await supabase.from('admin_users')
      .insert({ name: user.name, pin: user.pin, role: 'admin', permissions: user.permissions })
      .select().single()
    if (error) { console.error(error); return null }
    const newUser = adminFromDb(data)
    setAdminUsers(p => [...p, newUser])
    return newUser
  }

  const updateAdminUser = async (id, updates) => {
    const { error } = await supabase.from('admin_users').update(updates).eq('id', id)
    if (error) { console.error(error); return false }
    setAdminUsers(p => p.map(u => u.id === id ? { ...u, ...updates } : u))
    return true
  }

  const deleteAdminUser = async (id) => {
    const { error } = await supabase.from('admin_users').delete().eq('id', id)
    if (error) { console.error(error); return false }
    setAdminUsers(p => p.filter(u => u.id !== id))
    return true
  }

  // ─── CONFIG ───
  const updateConfig = async (key, value) => {
    const { error } = await supabase.from('config').upsert({ key, value: String(value), updated_at: new Date().toISOString() })
    if (error) { console.error(error); return false }
    setConfig(p => ({ ...p, [key]: String(value) }))
    return true
  }

  const updateConfigBatch = async (updates) => {
    const rows = Object.entries(updates).map(([key, value]) => ({
      key, value: String(value), updated_at: new Date().toISOString()
    }))
    const { error } = await supabase.from('config').upsert(rows)
    if (error) { console.error(error); return false }
    setConfig(p => {
      const next = { ...p }
      Object.entries(updates).forEach(([k, v]) => { next[k] = String(v) })
      return next
    })
    return true
  }

  return {
    // State
    materials, leads, adminUsers, config, loading, error,
    // Setters (for local-only updates like optimistic UI)
    setMaterials, setLeads,
    // Materials
    addMaterial, updateMaterial, deleteMaterial,
    // Leads
    addLead, updateLead, findLeadByWhatsApp,
    // Admin
    authenticateAdmin, addAdminUser, updateAdminUser, deleteAdminUser,
    // Config
    updateConfig, updateConfigBatch,
    // Reload
    reload: loadAll,
  }
}
