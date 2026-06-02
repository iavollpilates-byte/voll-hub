import { useMemo, useState } from "react";

const CATS = [
  { id: "gestao", label: "Gestão" },
  { id: "marketing", label: "Marketing" },
  { id: "vendas", label: "Vendas" },
];

function safeJsonParse(str, fallback) {
  try { return JSON.parse(str); } catch (_) { return fallback; }
}

export default function AdminVideos({ T, db, showT, videos }) {
  const [editingId, setEditingId] = useState(null);

  const [newOpen, setNewOpen] = useState(false);
  const [draft, setDraft] = useState({ title: "", description: "", category: "marketing", youtube_url: "", active: true, sort_order: 0, slug: "" });
  const [draftMaterials, setDraftMaterials] = useState("[]");
  const [draftCta, setDraftCta] = useState('{"label":"","url":"","buttonText":""}');

  const inp = { width: "100%", padding: "8px 12px", borderRadius: 10, border: `1px solid ${T.inputBorder}`, background: T.inputBg, color: T.text, fontSize: 13, fontFamily: "'Plus Jakarta Sans'", boxSizing: "border-box" };
  const btn = (kind) => ({
    padding: "8px 12px",
    borderRadius: 10,
    border: `1px solid ${kind === "primary" ? T.accent + "44" : T.statBorder}`,
    background: kind === "primary" ? T.accent + "18" : T.statBg,
    color: kind === "primary" ? T.accent : T.text,
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
    fontFamily: "'Plus Jakarta Sans'",
  });

  const createVideo = async () => {
    const materials = safeJsonParse(draftMaterials, []);
    const cta = safeJsonParse(draftCta, {});
    const created = await db.addVideo({ ...draft, materials, cta });
    if (!created) return showT("Erro ao criar vídeo. Verifique título e URL.");
    showT("Vídeo criado! ✅");
    setNewOpen(false);
    setDraft({ title: "", description: "", category: "marketing", youtube_url: "", active: true, sort_order: 0, slug: "" });
    setDraftMaterials("[]");
    setDraftCta('{"label":"","url":"","buttonText":""}');
  };

  const updateVideo = async (id, patch) => {
    const ok = await db.updateVideo(id, patch);
    if (!ok) showT("Erro ao salvar.");
    else showT("Salvo! ✅");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 900, color: T.text, marginBottom: 2 }}>🎥 Aulas</h2>
          <p style={{ fontSize: 12, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'" }}>1 tema = 1 vídeo (10–15 min) + materiais + CTA</p>
        </div>
        <button type="button" onClick={() => setNewOpen(o => !o)} style={btn("primary")}>
          + Nova aula
        </button>
      </div>

      {newOpen && (
        <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 10 }}>
            <div>
              <label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Título</label>
              <input value={draft.title} onChange={(e) => setDraft(p => ({ ...p, title: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Categoria</label>
              <select value={draft.category} onChange={(e) => setDraft(p => ({ ...p, category: e.target.value }))} style={inp}>
                {CATS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Descrição</label>
            <textarea value={draft.description} onChange={(e) => setDraft(p => ({ ...p, description: e.target.value }))} style={{ ...inp, minHeight: 70, resize: "vertical" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px", gap: 10, marginTop: 10 }}>
            <div>
              <label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>URL do YouTube</label>
              <input value={draft.youtube_url} onChange={(e) => setDraft(p => ({ ...p, youtube_url: e.target.value }))} style={inp} placeholder="https://youtube.com/watch?v=..." />
            </div>
            <div>
              <label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Ordem</label>
              <input type="number" value={draft.sort_order} onChange={(e) => setDraft(p => ({ ...p, sort_order: parseInt(e.target.value || "0") }))} style={inp} />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'", marginBottom: 2 }}>
                <input type="checkbox" checked={!!draft.active} onChange={(e) => setDraft(p => ({ ...p, active: e.target.checked }))} />
                Ativo
              </label>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
            <div>
              <label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Materiais (JSON)</label>
              <textarea value={draftMaterials} onChange={(e) => setDraftMaterials(e.target.value)} style={{ ...inp, minHeight: 90, resize: "vertical", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontSize: 12 }} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>CTA (JSON)</label>
              <textarea value={draftCta} onChange={(e) => setDraftCta(e.target.value)} style={{ ...inp, minHeight: 90, resize: "vertical", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontSize: 12 }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="button" onClick={createVideo} style={btn("primary")}>Criar</button>
            <button type="button" onClick={() => setNewOpen(false)} style={btn("soft")}>Cancelar</button>
          </div>
          <p style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginTop: 10 }}>
            Materiais (JSON) exemplo: <span style={{ fontFamily: "ui-monospace" }}>{'[{"title":"Checklist","url":"https://..."}]'}</span>
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(videos || []).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map(v => (
          <div key={v.id} style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 10, fontWeight: 900, color: T.textFaint, letterSpacing: 0.6, textTransform: "uppercase", fontFamily: "'Plus Jakarta Sans'", marginBottom: 4 }}>
                  {(CATS.find(c => c.id === v.category)?.label || v.category) + (v.active ? "" : " (inativo)")}
                </p>
                <p style={{ fontSize: 14, fontWeight: 900, color: T.text, fontFamily: "'Plus Jakarta Sans'", margin: 0, lineHeight: 1.3 }}>
                  {v.title}
                </p>
              </div>
              <button type="button" onClick={() => setEditingId(id => id === v.id ? null : v.id)} style={btn("soft")}>
                {editingId === v.id ? "Fechar" : "Editar"}
              </button>
            </div>

            {editingId === v.id && (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Título</label>
                    <input defaultValue={v.title} onBlur={(e) => updateVideo(v.id, { title: e.target.value })} style={inp} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Categoria</label>
                    <select defaultValue={v.category} onChange={(e) => updateVideo(v.id, { category: e.target.value })} style={inp}>
                      {CATS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Descrição</label>
                  <textarea defaultValue={v.description || ""} onBlur={(e) => updateVideo(v.id, { description: e.target.value })} style={{ ...inp, minHeight: 70, resize: "vertical" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>URL do YouTube</label>
                    <input defaultValue={v.youtube_url || ""} onBlur={(e) => updateVideo(v.id, { youtube_url: e.target.value })} style={inp} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Ordem</label>
                    <input type="number" defaultValue={v.sort_order ?? 0} onBlur={(e) => updateVideo(v.id, { sort_order: parseInt(e.target.value || "0") })} style={inp} />
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'" }}>
                      <input type="checkbox" defaultChecked={v.active !== false} onChange={(e) => updateVideo(v.id, { active: e.target.checked })} />
                      Ativo
                    </label>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Materiais (JSON)</label>
                    <textarea
                      defaultValue={JSON.stringify(v.materials || [], null, 2)}
                      onBlur={(e) => updateVideo(v.id, { materials: safeJsonParse(e.target.value, []) })}
                      style={{ ...inp, minHeight: 90, resize: "vertical", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>CTA (JSON)</label>
                    <textarea
                      defaultValue={JSON.stringify(v.cta || {}, null, 2)}
                      onBlur={(e) => updateVideo(v.id, { cta: safeJsonParse(e.target.value, {}) })}
                      style={{ ...inp, minHeight: 90, resize: "vertical", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontSize: 12 }}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm("Excluir este vídeo?")) return;
                      const ok = await db.deleteVideo(v.id);
                      if (ok) { showT("Excluído! 🗑️"); setEditingId(null); }
                      else showT("Erro ao excluir.");
                    }}
                    style={{ ...btn("soft"), border: `1px solid ${T.dangerBrd}`, background: T.dangerBg, color: T.dangerTxt }}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {!newOpen && (videos || []).length === 0 && (
        <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: 18, textAlign: "center" }}>
          <p style={{ fontSize: 28, marginBottom: 8 }}>🎥</p>
          <p style={{ fontSize: 13, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'" }}>Crie sua primeira aula para ela aparecer no app.</p>
        </div>
      )}
    </div>
  );
}

