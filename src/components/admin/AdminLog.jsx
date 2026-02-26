export default function AdminLog({ T, activityLog, setActivityLog }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text }}>📜 Atividades desta sessão</h3>
        <button onClick={() => setActivityLog([])} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: T.dangerBg, color: T.dangerTxt, border: `1px solid ${T.dangerBrd}` }}>Limpar</button>
      </div>
      {activityLog.length === 0 && <p style={{ textAlign: "center", fontSize: 12, color: T.textFaint, padding: 20, fontFamily: "'Plus Jakarta Sans'" }}>Nenhuma atividade registrada ainda.</p>}
      {activityLog.map((log, i) => (
        <div key={i} style={{ background: T.statBg, border: `1px solid ${T.statBorder}`, borderRadius: 8, padding: "8px 10px", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: T.avBg, border: `1px solid ${T.avBrd}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: T.accent, flexShrink: 0 }}>{log.who.charAt(0)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{log.who}</p>
            <p style={{ fontSize: 10, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.action}</p>
          </div>
          <span style={{ fontSize: 10, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'", whiteSpace: "nowrap" }}>{log.time}</span>
        </div>
      ))}
    </div>
  );
}
