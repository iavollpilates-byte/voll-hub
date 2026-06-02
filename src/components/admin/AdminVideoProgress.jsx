import { useEffect, useMemo, useState } from "react";

function uniq(arr) {
  return Array.from(new Set(arr));
}

export default function AdminVideoProgress({ T, db, showT, videos, leads }) {
  const [videoId, setVideoId] = useState("all");
  const [rows, setRows] = useState({ play: [], mark50: [] });
  const [loading, setLoading] = useState(false);

  const inp = { width: "100%", padding: "8px 12px", borderRadius: 10, border: `1px solid ${T.inputBorder}`, background: T.inputBg, color: T.text, fontSize: 13, fontFamily: "'Plus Jakarta Sans'", boxSizing: "border-box" };

  const leadById = useMemo(() => {
    const m = new Map();
    (leads || []).forEach(l => m.set(l.id, l));
    return m;
  }, [leads]);

  const load = async () => {
    setLoading(true);
    try {
      const filtersBase = {};
      if (videoId !== "all") filtersBase.video_id = parseInt(videoId);

      const [plays, marks] = await Promise.all([
        db.adminSelect({ table: "video_events", select: "*", filters: { ...filtersBase, event_type: "play" }, order: { column: "created_at", ascending: false }, range: { from: 0, to: 5000 } }),
        db.adminSelect({ table: "video_events", select: "*", filters: { ...filtersBase, event_type: "mark_50" }, order: { column: "created_at", ascending: false }, range: { from: 0, to: 5000 } }),
      ]);
      setRows({ play: plays || [], mark50: marks || [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [videoId]); // eslint-disable-line react-hooks/exhaustive-deps

  const playLeadIds = useMemo(() => uniq((rows.play || []).map(r => r.lead_id)), [rows.play]);
  const markLeadIds = useMemo(() => uniq((rows.mark50 || []).map(r => r.lead_id)), [rows.mark50]);

  const withLead = (id) => leadById.get(id) || null;

  const selectedVideo = useMemo(() => (videos || []).find(v => String(v.id) === String(videoId)) || null, [videos, videoId]);

  const statCard = (label, value, sub, color) => (
    <div style={{ flex: 1, minWidth: 120, background: T.statBg, border: `1px solid ${T.statBorder}`, borderRadius: 14, padding: "12px 12px", textAlign: "center" }}>
      <p style={{ fontSize: 20, fontWeight: 900, color, margin: 0 }}>{value}</p>
      <p style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginTop: 4 }}>{label}</p>
      {sub && <p style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", marginTop: 2 }}>{sub}</p>}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 900, color: T.text, marginBottom: 2 }}>📈 Progresso</h2>
          <p style={{ fontSize: 12, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'" }}>Play = assistiu. Marcar 50%+ = assistiu tudo.</p>
        </div>
        <button type="button" onClick={() => { load(); showT("Atualizado! 🔄"); }} style={{ padding: "8px 12px", borderRadius: 10, background: T.statBg, border: `1px solid ${T.statBorder}`, color: T.text, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "'Plus Jakarta Sans'" }}>
          🔄 Atualizar
        </button>
      </div>

      <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 10 }}>
          <select value={videoId} onChange={(e) => setVideoId(e.target.value)} style={inp}>
            <option value="all">Todos os vídeos</option>
            {(videos || []).map(v => <option key={v.id} value={String(v.id)}>{v.title}</option>)}
          </select>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
            <span style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>{loading ? "Carregando…" : ""}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {statCard("Deu play", playLeadIds.length, selectedVideo ? "neste vídeo" : "em qualquer vídeo", T.accent)}
          {statCard("50%+", markLeadIds.length, selectedVideo ? "neste vídeo" : "em qualquer vídeo", T.gold)}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: 14 }}>
          <h3 style={{ fontSize: 13, fontWeight: 900, color: T.text, marginBottom: 10 }}>Quem deu play</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {playLeadIds.slice(0, 200).map(id => {
              const l = withLead(id);
              return (
                <div key={id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "8px 10px", borderRadius: 12, background: T.statBg, border: `1px solid ${T.statBorder}` }}>
                  <span style={{ fontSize: 12, color: T.text, fontFamily: "'Plus Jakarta Sans'", fontWeight: 700 }}>{l ? l.name : `Lead #${id}`}</span>
                  <span style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>{l ? l.whatsapp : ""}</span>
                </div>
              );
            })}
            {playLeadIds.length === 0 && !loading && (
              <p style={{ fontSize: 12, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'" }}>Nenhum play registrado.</p>
            )}
            {playLeadIds.length > 200 && (
              <p style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Mostrando 200 de {playLeadIds.length}.</p>
            )}
          </div>
        </div>

        <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: 14 }}>
          <h3 style={{ fontSize: 13, fontWeight: 900, color: T.text, marginBottom: 10 }}>Quem marcou 50%+</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {markLeadIds.slice(0, 200).map(id => {
              const l = withLead(id);
              return (
                <div key={id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "8px 10px", borderRadius: 12, background: T.statBg, border: `1px solid ${T.statBorder}` }}>
                  <span style={{ fontSize: 12, color: T.text, fontFamily: "'Plus Jakarta Sans'", fontWeight: 700 }}>{l ? l.name : `Lead #${id}`}</span>
                  <span style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>{l ? l.whatsapp : ""}</span>
                </div>
              );
            })}
            {markLeadIds.length === 0 && !loading && (
              <p style={{ fontSize: 12, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'" }}>Ninguém marcou 50%+ ainda.</p>
            )}
            {markLeadIds.length > 200 && (
              <p style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>Mostrando 200 de {markLeadIds.length}.</p>
            )}
          </div>
        </div>
      </div>

      <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: 14 }}>
        <p style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", lineHeight: 1.4, margin: 0 }}>
          Nota: este relatório usa eventos registrados no app. Se você quiser “quem não deu play”, a forma mais segura é segmentar por período (ex.: leads criados nos últimos X dias) e comparar manualmente com a lista de plays.
        </p>
      </div>
    </div>
  );
}

