import { useMemo, useState } from 'react'

const CATEGORY_LABEL = {
  gestao: 'Gestão',
  marketing: 'Marketing',
  vendas: 'Vendas',
}

export default function VideosList({ T, videos, onSelect }) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')

  const filtered = useMemo(() => {
    const query = String(q || '').trim().toLowerCase()
    return (videos || [])
      .filter(v => v && v.active !== false)
      .filter(v => (cat === 'all' ? true : String(v.category || '') === cat))
      .filter(v => !query || String(v.title || '').toLowerCase().includes(query) || String(v.description || '').toLowerCase().includes(query))
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  }, [videos, q, cat])

  const inp = { width: '100%', padding: '10px 12px', borderRadius: 12, border: `1px solid ${T.inputBorder}`, background: T.inputBg, color: T.text, fontSize: 13, fontFamily: "'Plus Jakarta Sans'", boxSizing: 'border-box' }
  const chip = (active) => ({ padding: '6px 10px', borderRadius: 999, border: `1px solid ${active ? T.accent + '44' : T.statBorder}`, background: active ? T.accent + '18' : T.statBg, color: active ? T.accent : T.textFaint, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans'" })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 900, color: T.text, marginBottom: 6 }}>Aulas (10–15 min)</h2>
        <p style={{ fontSize: 13, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'", lineHeight: 1.6 }}>
          Conteúdos sobre gestão, marketing e vendas para Pilates.
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {['all', 'gestao', 'marketing', 'vendas'].map((c) => (
            <button key={c} type="button" onClick={() => setCat(c)} style={chip(cat === c)}>
              {c === 'all' ? 'Todos' : CATEGORY_LABEL[c] || c}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 12 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Buscar por tema…" style={inp} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: 22, textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🎥</div>
          <p style={{ fontSize: 14, fontWeight: 800, color: T.text, fontFamily: "'Plus Jakarta Sans'", marginBottom: 6 }}>
            Nenhuma aula disponível
          </p>
          <p style={{ fontSize: 12, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'", lineHeight: 1.6 }}>
            Assim que você publicar uma aula no admin, ela aparece aqui.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => onSelect(v)}
              style={{ textAlign: 'left', width: '100%', background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: 16, cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 10, fontWeight: 900, color: T.textFaint, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: "'Plus Jakarta Sans'", marginBottom: 6 }}>
                    {CATEGORY_LABEL[v.category] || v.category || 'Aula'}
                  </p>
                  <p style={{ fontSize: 14, fontWeight: 900, color: T.text, fontFamily: "'Plus Jakarta Sans'", margin: 0, lineHeight: 1.35 }}>
                    {v.title}
                  </p>
                  {!!v.description && (
                    <p style={{ fontSize: 12, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'", marginTop: 6, lineHeight: 1.5 }}>
                      {String(v.description).slice(0, 120)}{String(v.description).length > 120 ? '…' : ''}
                    </p>
                  )}
                </div>
                <div style={{ flexShrink: 0, fontSize: 16, color: T.accent, fontWeight: 900 }}>→</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

