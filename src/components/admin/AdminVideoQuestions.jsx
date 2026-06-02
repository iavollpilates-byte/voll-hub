import { useEffect, useMemo, useState } from "react";

export default function AdminVideoQuestions({ T, db, showT, videos, leads }) {
  const [status, setStatus] = useState("new");
  const [videoId, setVideoId] = useState("all");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState(null);

  const inp = { width: "100%", padding: "8px 12px", borderRadius: 10, border: `1px solid ${T.inputBorder}`, background: T.inputBg, color: T.text, fontSize: 13, fontFamily: "'Plus Jakarta Sans'", boxSizing: "border-box" };
  const btn = (active) => ({ padding: "6px 10px", borderRadius: 999, background: active ? T.accent + "18" : T.statBg, border: `1px solid ${active ? T.accent + "44" : T.statBorder}`, color: active ? T.accent : T.textFaint, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" });

  const leadById = useMemo(() => {
    const m = new Map();
    (leads || []).forEach(l => m.set(l.id, l));
    return m;
  }, [leads]);
  const videoById = useMemo(() => {
    const m = new Map();
    (videos || []).forEach(v => m.set(v.id, v));
    return m;
  }, [videos]);

  const load = async () => {
    setLoading(true);
    try {
      const filters = { status };
      if (videoId !== "all") filters.video_id = parseInt(videoId);
      const data = await db.adminSelect({
        table: "video_questions",
        select: "*",
        filters,
        order: { column: "created_at", ascending: false },
        range: { from: 0, to: 200 },
      });
      let out = data || [];
      const query = String(q || "").trim().toLowerCase();
      if (query) {
        out = out.filter(r => String(r.question || "").toLowerCase().includes(query));
      }
      setRows(out);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [status, videoId]); // eslint-disable-line react-hooks/exhaustive-deps

  const setRow = (id, patch) => setRows(p => p.map(r => r.id === id ? { ...r, ...patch } : r));

  const updateStatus = async (row, nextStatus) => {
    const ok = await db.adminUpdate({ table: "video_questions", data: { status: nextStatus }, match: { id: row.id } });
    if (!ok) return showT("Erro ao atualizar.");
    showT("Atualizado! ✅");
    setRow(row.id, { status: nextStatus });
  };

  const saveAnswer = async (row, text) => {
    const ok = await db.adminUpdate({
      table: "video_questions",
      data: { answer_text: text, answered_at: new Date().toISOString(), status: "answered" },
      match: { id: row.id },
    });
    if (!ok) return showT("Erro ao salvar resposta.");
    showT("Respondido! ✅");
    setRow(row.id, { answer_text: text, answered_at: new Date().toISOString(), status: "answered" });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 900, color: T.text, marginBottom: 2 }}>❓ Perguntas</h2>
          <p style={{ fontSize: 12, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'" }}>Triagem de dúvidas para pautar novos conteúdos/cursos.</p>
        </div>
        <button type="button" onClick={load} style={{ padding: "8px 12px", borderRadius: 10, background: T.statBg, border: `1px solid ${T.statBorder}`, color: T.text, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>
          🔄 Atualizar
        </button>
      </div>

      <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["new", "answered", "content_idea"].map(s => (
            <button key={s} type="button" onClick={() => setStatus(s)} style={btn(status === s)}>
              {s === "new" ? "Novas" : s === "answered" ? "Respondidas" : "Virou conteúdo"}
            </button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 10 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar no texto da pergunta…" style={inp} />
          <select value={videoId} onChange={(e) => setVideoId(e.target.value)} style={inp}>
            <option value="all">Todos os vídeos</option>
            {(videos || []).filter(v => v.active !== false).map(v => (
              <option key={v.id} value={String(v.id)}>{v.title}</option>
            ))}
          </select>
        </div>
        <p style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>
          Mostrando {rows.length}{loading ? " (carregando…)" : ""}.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map(r => {
          const l = leadById.get(r.lead_id);
          const v = videoById.get(r.video_id);
          const open = openId === r.id;
          return (
            <div key={r.id} style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: 14 }}>
              <button type="button" onClick={() => setOpenId(id => id === r.id ? null : r.id)} style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                <p style={{ fontSize: 12, fontWeight: 900, color: T.text, fontFamily: "'Plus Jakarta Sans'", marginBottom: 6 }}>
                  {v?.title || `Vídeo #${r.video_id}`}
                </p>
                <p style={{ fontSize: 13, color: T.text, fontFamily: "'Plus Jakarta Sans'", lineHeight: 1.55, marginBottom: 6 }}>
                  {r.question}
                </p>
                <p style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>
                  {l ? `${l.name} • ${l.whatsapp}` : `Lead #${r.lead_id}`} • {new Date(r.created_at).toLocaleString("pt-BR")}
                </p>
              </button>

              {open && (
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" onClick={() => updateStatus(r, "content_idea")} style={{ padding: "8px 10px", borderRadius: 10, background: T.gold + "18", border: `1px solid ${T.gold}44`, color: T.gold, fontSize: 12, fontWeight: 900, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>
                      ✍️ Virou conteúdo
                    </button>
                    {r.status !== "answered" && (
                      <button type="button" onClick={() => updateStatus(r, "answered")} style={{ padding: "8px 10px", borderRadius: 10, background: T.accent + "18", border: `1px solid ${T.accent}44`, color: T.accent, fontSize: 12, fontWeight: 900, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>
                        ✅ Marcar respondida
                      </button>
                    )}
                  </div>

                  <div>
                    <label style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Resposta (opcional)</label>
                    <textarea
                      defaultValue={r.answer_text || ""}
                      onBlur={(e) => {
                        const text = e.target.value || "";
                        if (text.trim().length === 0) return;
                        saveAnswer(r, text);
                      }}
                      placeholder="Escreva a resposta (ou um rascunho) e clique fora para salvar…"
                      style={{ ...inp, minHeight: 90, resize: "vertical" }}
                    />
                    <p style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginTop: 6 }}>
                      Dica: se o usuário marcou “pode responder no WhatsApp”, isso fica em `context.allowWhatsApp`.
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {rows.length === 0 && !loading && (
          <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: 18, textAlign: "center" }}>
            <p style={{ fontSize: 28, marginBottom: 8 }}>🗂️</p>
            <p style={{ fontSize: 13, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'" }}>Sem perguntas nessa visão.</p>
          </div>
        )}
      </div>
    </div>
  );
}

